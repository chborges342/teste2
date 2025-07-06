// script.js

// Configuração do Firebase (substitua com suas credenciais)
const firebaseConfig = {
    apiKey: "AIzaSyASeIQJoEC5FmH3N85uf0O93ngYxvFS-T8",
    authDomain: "gestaotarefas-862e0.firebaseapp.com",
    projectId: "gestaotarefas-862e0",
    storageBucket: "gestaotarefas-862e0.appspot.com",
    messagingSenderId: "425723057663",
    appId: "1:425723057663:web:c2e145985690b8c24fc3ca"
};

// Inicialização do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, orderBy, doc, updateDoc, deleteDoc, where, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elementos da UI (com verificação segura)
const elements = {
    // Autenticação
    loggedOutView: document.getElementById('logged-out-view'),
    loggedInView: document.getElementById('logged-in-view'),
    userEmailDisplay: document.getElementById('user-email-display'),
    logoutButton: document.getElementById('logout-button'),
    loginForm: document.getElementById('login-form'),
    loginEmailInput: document.getElementById('login-email'),
    loginPasswordInput: document.getElementById('login-password'),
    loginErrorDisplay: document.getElementById('login-error'),
    signupForm: document.getElementById('signup-form'),
    signupEmailInput: document.getElementById('signup-email'),
    signupPasswordInput: document.getElementById('signup-password'),
    signupErrorDisplay: document.getElementById('signup-error'),
    
    // Tarefas
    taskForm: document.getElementById('task-form'),
    tasksTableBody: document.getElementById('tasks-table-body'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    taskAssigneeSelect: document.getElementById('task-assignee'),
    
    // Filtros
    filterStatusSelect: document.getElementById('filter-status'),
    filterAssigneeSelect: document.getElementById('filter-assignee'),
    filterStartDateInput: document.getElementById('filter-start-date'),
    filterEndDateInput: document.getElementById('filter-end-date'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Layout
    mainGrid: document.querySelector('.main-grid'),
    authSection: document.getElementById('auth-section')
};

// Verificação de elementos críticos
const requiredElements = ['taskForm', 'tasksTableBody', 'loginForm', 'signupForm'];
requiredElements.forEach(el => {
    if (!elements[el]) {
        console.error(`Elemento crítico não encontrado: ${el}`);
        alert(`Erro de configuração: Elemento ${el} não encontrado. Recarregue a página.`);
    }
});

// Variáveis de estado
let currentUserId = null;
let currentUserEmail = null;
let assigneeListenerUnsubscribe = null;
let tasksListenerUnsubscribe = null;

// Funções auxiliares
const utils = {
    showMessage: (message, isError = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flash-message ${isError ? 'flash-error' : 'flash-success'}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    },

    formatFirebaseDate: (date) => {
        if (!date) return null;
        try {
            return date.toDate ? date.toDate() : new Date(date);
        } catch (error) {
            console.error("Erro ao formatar data:", error);
            return null;
        }
    },

    escapeHtml: (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    isDeadlineClose: (deadlineDate) => {
        if (!deadlineDate) return false;
        const today = new Date();
        const deadline = utils.formatFirebaseDate(deadlineDate);
        const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
    }
};

// Renderização da Tarefa (atualizada)
function renderTask(task) {
    const row = document.createElement('tr');
    row.setAttribute('data-id', task.id);
    
    const deadlineDate = utils.formatFirebaseDate(task.deadline);
    const deadlineFormatted = deadlineDate ? deadlineDate.toLocaleDateString('pt-BR') : 'N/A';
    const isCloseDeadline = utils.isDeadlineClose(task.deadline);

    row.innerHTML = `
        <td class="${isCloseDeadline ? 'deadline-close' : ''}">${utils.escapeHtml(task.description)}</td>
        <td>${utils.escapeHtml(task.type)}</td>
        <td>${utils.escapeHtml(task.seiProcess || 'N/A')}</td>
        <td>${utils.escapeHtml(task.assignee)}</td>
        <td class="${isCloseDeadline ? 'deadline-close' : ''}">${deadlineFormatted}</td>
        <td class="status-cell"><span class="status-pill status-${task.status.replace(/\s/g, '-')}">${task.status}</span></td>
        <td class="observations-cell">${utils.escapeHtml(task.observations || '')}</td>
    `;

    if (task.userId === currentUserId) {
        row.addEventListener('click', () => editTask(task.id));
        row.style.cursor = 'pointer';
    }

    elements.tasksTableBody.appendChild(row);
}

// Dashboard
async function updateDashboard() {
    try {
        const q = query(collection(db, "tarefas"));
        const snapshot = await getDocs(q);
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Atualiza os cards de resumo
        updateSummaryCard('status-summary', tasks, 'status');
        updateSummaryCard('type-summary', tasks, 'type');
        updateSummaryCard('assignee-summary', tasks, 'assignee');
    } catch (error) {
        console.error("Erro ao atualizar dashboard:", error);
    }
}

function updateSummaryCard(elementId, tasks, field) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const summary = tasks.reduce((acc, task) => {
        const key = task[field] || 'Não definido';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    container.innerHTML = Object.entries(summary)
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => `
            <div class="summary-item">
                <span class="summary-label">${key}:</span>
                <span class="summary-value">${value}</span>
                <div class="summary-bar" style="width: ${(value / Math.max(...Object.values(summary))) * 100}%"></div>
            </div>
        `).join('');
}

// Gerenciamento de Tarefas
async function subscribeAndApplyFilters() {
    if (tasksListenerUnsubscribe) tasksListenerUnsubscribe();

    try {
        let q = query(collection(db, "tarefas"), orderBy("createdAt", "desc"));

        // Aplicar filtros
        if (elements.filterStatusSelect.value !== "all") {
            q = query(q, where("status", "==", elements.filterStatusSelect.value));
        }
        if (elements.filterAssigneeSelect.value !== "all") {
            q = query(q, where("assignee", "==", elements.filterAssigneeSelect.value));
        }
        if (elements.filterStartDateInput.value) {
            q = query(q, where("deadline", ">=", new Date(elements.filterStartDateInput.value)));
        }
        if (elements.filterEndDateInput.value) {
            const endDate = new Date(elements.filterEndDateInput.value);
            endDate.setHours(23, 59, 59);
            q = query(q, where("deadline", "<=", endDate));
        }

        tasksListenerUnsubscribe = onSnapshot(q, (snapshot) => {
            elements.tasksTableBody.innerHTML = snapshot.empty 
                ? '<tr><td colspan="7">Nenhuma tarefa encontrada</td></tr>'
                : '';
            
            snapshot.forEach(doc => {
                const data = doc.data();
                renderTask({
                    id: doc.id,
                    description: data.description || '',
                    type: data.type || '',
                    seiProcess: data.seiProcess || '',
                    assignee: data.assignee || '',
                    deadline: data.deadline,
                    observations: data.observations || '',
                    status: data.status || 'Não Iniciado',
                    userId: data.userId,
                    createdAt: data.createdAt
                });
            });

            updateDashboard();
        });

    } catch (error) {
        console.error("Erro na consulta:", error);
        utils.showMessage('Erro ao carregar tarefas. Verifique o console.', true);
    }
}

// Formulário de Tarefas
elements.taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        description: elements.taskForm.querySelector('#task-description').value.trim(),
        type: elements.taskForm.querySelector('#task-type').value,
        seiProcess: elements.taskForm.querySelector('#task-sei-process').value.trim(),
        assignee: elements.taskAssigneeSelect.value,
        deadline: new Date(`${elements.taskForm.querySelector('#task-deadline').value}T23:59:59`),
        observations: elements.taskForm.querySelector('#task-observations').value.trim(),
        status: elements.taskForm.querySelector('#task-status').value,
        updatedAt: new Date(),
        userId: currentUserId,
        createdBy: currentUserEmail
    };

    if (!formData.description || !formData.deadline) {
        utils.showMessage('Descrição e prazo são obrigatórios!', true);
        return;
    }

    try {
        const isEditMode = elements.taskForm.querySelector('button[type="submit"]').textContent.includes("Atualizar");
        
        if (isEditMode) {
            const taskId = elements.taskForm.querySelector('button[type="submit"]').dataset.taskId;
            await updateDoc(doc(db, "tarefas", taskId), formData);
            utils.showMessage('Tarefa atualizada!');
        } else {
            formData.createdAt = new Date();
            await addDoc(collection(db, "tarefas"), formData);
            utils.showMessage('Tarefa criada!');
        }

        elements.taskForm.reset();
        elements.cancelEditBtn.style.display = 'none';
        elements.taskForm.querySelector('button[type="submit"]').textContent = "Salvar Tarefa";
        delete elements.taskForm.querySelector('button[type="submit"]').dataset.taskId;

    } catch (error) {
        console.error("Erro ao salvar tarefa:", error);
        utils.showMessage(`Erro: ${error.message}`, true);
    }
});

// Autenticação
elements.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(
            auth, 
            elements.loginEmailInput.value.trim(), 
            elements.loginPasswordInput.value.trim()
        );
        elements.loginErrorDisplay.textContent = '';
    } catch (error) {
        elements.loginErrorDisplay.textContent = "Credenciais inválidas";
        utils.showMessage('Falha no login: ' + error.message, true);
    }
});

elements.signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await createUserWithEmailAndPassword(
            auth, 
            elements.signupEmailInput.value.trim(), 
            elements.signupPasswordInput.value.trim()
        );
        elements.signupErrorDisplay.textContent = '';
    } catch (error) {
        elements.signupErrorDisplay.textContent = error.message;
        utils.showMessage('Falha no cadastro: ' + error.message, true);
    }
});

elements.logoutButton?.addEventListener('click', () => signOut(auth));

// Inicialização
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        
        // Atualizar UI
        elements.userEmailDisplay.textContent = user.email;
        elements.loggedInView.style.display = 'flex';
        elements.loggedOutView.style.display = 'none';
        elements.mainGrid.style.display = 'grid';
        elements.authSection.style.display = 'none';
        
        // Carregar dados
        subscribeAndApplyFilters();
        updateDashboard();

    } else {
        // Resetar estado
        currentUserId = null;
        currentUserEmail = null;
        
        // Atualizar UI
        elements.loggedInView.style.display = 'none';
        elements.loggedOutView.style.display = 'block';
        elements.mainGrid.style.display = 'none';
        elements.authSection.style.display = 'block';
        elements.tasksTableBody.innerHTML = '<tr><td colspan="7">Faça login para gerenciar tarefas</td></tr>';
    }
});

// Inicialização segura
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema inicializado");
    
    // Configura listeners seguros
    elements.cancelEditBtn?.addEventListener('click', () => {
        elements.taskForm.reset();
        elements.cancelEditBtn.style.display = 'none';
        elements.taskForm.querySelector('button[type="submit"]').textContent = "Salvar Tarefa";
        delete elements.taskForm.querySelector('button[type="submit"]').dataset.taskId;
    });

    elements.resetFiltersBtn?.addEventListener('click', () => {
        elements.filterStatusSelect.value = "all";
        elements.filterAssigneeSelect.value = "all";
        elements.filterStartDateInput.value = "";
        elements.filterEndDateInput.value = "";
        subscribeAndApplyFilters();
        utils.showMessage('Filtros resetados');
    });
});
