// script.js

// Configuração do Firebase
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

// Seleção segura de elementos
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Elemento não encontrado: #${id}`);
    return el;
}

// Elementos da UI
const elements = {
    // Autenticação
    loggedOutView: getElement('logged-out-view'),
    loggedInView: getElement('logged-in-view'),
    userEmailDisplay: getElement('user-email-display'),
    logoutButton: getElement('logout-button'),
    loginForm: getElement('login-form'),
    loginEmailInput: getElement('login-email'),
    loginPasswordInput: getElement('login-password'),
    loginErrorDisplay: getElement('login-error'),
    signupForm: getElement('signup-form'),
    signupEmailInput: getElement('signup-email'),
    signupPasswordInput: getElement('signup-password'),
    signupErrorDisplay: getElement('signup-error'),
    
    // Tarefas
    taskForm: getElement('task-form'),
    tasksTableBody: getElement('tasks-table-body'),
    cancelEditBtn: getElement('cancel-edit-btn'),
    taskAssigneeSelect: getElement('task-assignee'),
    
    // Filtros
    filterStatusSelect: getElement('filter-status'),
    filterAssigneeSelect: getElement('filter-assignee'),
    filterStartDateInput: getElement('filter-start-date'),
    filterEndDateInput: getElement('filter-end-date'),
    resetFiltersBtn: getElement('reset-filters-btn'),
    
    // Layout
    mainGrid: document.querySelector('.main-grid'),
    authSection: getElement('auth-section')
};

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

    formatDate: (date) => {
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

    isDeadlineClose: (deadline) => {
        if (!deadline) return false;
        const today = new Date();
        const deadlineDate = utils.formatDate(deadline);
        const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
    }
};

// Renderização de tarefas
function renderTask(task) {
    if (!elements.tasksTableBody) return;

    const row = document.createElement('tr');
    row.setAttribute('data-id', task.id);
    
    const deadlineDate = utils.formatDate(task.deadline);
    const deadlineFormatted = deadlineDate ? deadlineDate.toLocaleDateString('pt-BR') : 'N/A';
    const isCloseDeadline = utils.isDeadlineClose(task.deadline);

    row.innerHTML = `
        <td class="${isCloseDeadline ? 'deadline-close' : ''}">${utils.escapeHtml(task.description)}</td>
        <td>${utils.escapeHtml(task.type)}</td>
        <td>${utils.escapeHtml(task.seiProcess || 'N/A')}</td>
        <td>${utils.escapeHtml(task.assignee)}</td>
        <td class="${isCloseDeadline ? 'deadline-close' : ''}">${deadlineFormatted}</td>
        <td><span class="status-pill status-${task.status.replace(/\s/g, '-')}">${task.status}</span></td>
        <td>${utils.escapeHtml(task.observations || '')}</td>
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

        // Atualizar cards de resumo
        updateSummary('status-summary', tasks, 'status');
        updateSummary('type-summary', tasks, 'type');
        updateSummary('assignee-summary', tasks, 'assignee');

    } catch (error) {
        console.error("Erro no dashboard:", error);
    }
}

function updateSummary(elementId, tasks, field) {
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
                <span>${key}:</span>
                <strong>${value}</strong>
            </div>
        `).join('');
}

// Gerenciamento de tarefas
function subscribeAndApplyFilters() {
    if (tasksListenerUnsubscribe) tasksListenerUnsubscribe();

    try {
        let q = query(collection(db, "tarefas"), orderBy("createdAt", "desc"));

        // Aplicar filtros
        if (elements.filterStatusSelect?.value !== "all") {
            q = query(q, where("status", "==", elements.filterStatusSelect.value));
        }
        if (elements.filterAssigneeSelect?.value !== "all") {
            q = query(q, where("assignee", "==", elements.filterAssigneeSelect.value));
        }
        if (elements.filterStartDateInput?.value) {
            q = query(q, where("deadline", ">=", new Date(elements.filterStartDateInput.value)));
        }
        if (elements.filterEndDateInput?.value) {
            const endDate = new Date(elements.filterEndDateInput.value);
            endDate.setHours(23, 59, 59);
            q = query(q, where("deadline", "<=", endDate));
        }

        tasksListenerUnsubscribe = onSnapshot(q, (snapshot) => {
            if (!elements.tasksTableBody) return;
            
            elements.tasksTableBody.innerHTML = snapshot.empty 
                ? '<tr><td colspan="7">Nenhuma tarefa encontrada</td></tr>' 
                : '';

            snapshot.forEach(doc => {
                const data = doc.data();
                renderTask({
                    id: doc.id,
                    ...data,
                    description: data.description || '',
                    type: data.type || '',
                    seiProcess: data.seiProcess || '',
                    assignee: data.assignee || '',
                    observations: data.observations || '',
                    status: data.status || 'Não Iniciado'
                });
            });

            updateDashboard();
        });

    } catch (error) {
        console.error("Erro nos filtros:", error);
        utils.showMessage('Erro ao filtrar tarefas', true);
    }
}

// Formulário de tarefas
if (elements.taskForm) {
    elements.taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            description: getElement('task-description')?.value.trim(),
            type: getElement('task-type')?.value,
            seiProcess: getElement('task-sei-process')?.value.trim(),
            assignee: elements.taskAssigneeSelect?.value,
            deadline: getElement('task-deadline')?.value,
            observations: getElement('task-observations')?.value.trim(),
            status: getElement('task-status')?.value,
            updatedAt: new Date(),
            userId: currentUserId,
            createdBy: currentUserEmail
        };

        if (!formData.description || !formData.deadline) {
            utils.showMessage('Descrição e prazo são obrigatórios', true);
            return;
        }

        try {
            formData.deadline = new Date(`${formData.deadline}T23:59:59`);
            const isEditMode = elements.taskForm.querySelector('button[type="submit"]')?.textContent.includes("Atualizar");

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
            if (elements.cancelEditBtn) elements.cancelEditBtn.style.display = 'none';
            const submitBtn = elements.taskForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = "Salvar Tarefa";
                delete submitBtn.dataset.taskId;
            }

        } catch (error) {
            console.error("Erro ao salvar tarefa:", error);
            utils.showMessage('Erro ao salvar: ' + error.message, true);
        }
    });
}

// Autenticação
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(
                auth,
                elements.loginEmailInput?.value.trim() || '',
                elements.loginPasswordInput?.value.trim() || ''
            );
            if (elements.loginErrorDisplay) elements.loginErrorDisplay.textContent = '';
        } catch (error) {
            if (elements.loginErrorDisplay) elements.loginErrorDisplay.textContent = "Credenciais inválidas";
            utils.showMessage('Falha no login: ' + error.message, true);
        }
    });
}

if (elements.signupForm) {
    elements.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(
                auth,
                elements.signupEmailInput?.value.trim() || '',
                elements.signupPasswordInput?.value.trim() || ''
            );
            if (elements.signupErrorDisplay) elements.signupErrorDisplay.textContent = '';
        } catch (error) {
            if (elements.signupErrorDisplay) elements.signupErrorDisplay.textContent = error.message;
            utils.showMessage('Falha no cadastro: ' + error.message, true);
        }
    });
}

if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', () => {
        signOut(auth).catch(error => {
            console.error("Erro ao sair:", error);
            utils.showMessage('Erro ao sair da conta', true);
        });
    });
}

// Gerenciamento de estado
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;

        // Atualizar UI
        if (elements.userEmailDisplay) elements.userEmailDisplay.textContent = user.email;
        if (elements.loggedInView) elements.loggedInView.style.display = 'flex';
        if (elements.loggedOutView) elements.loggedOutView.style.display = 'none';
        if (elements.mainGrid) elements.mainGrid.style.display = 'grid';
        if (elements.authSection) elements.authSection.style.display = 'none';

        // Carregar dados
        subscribeAndApplyFilters();

    } else {
        currentUserId = null;
        currentUserEmail = null;

        // Resetar UI
        if (elements.loggedInView) elements.loggedInView.style.display = 'none';
        if (elements.loggedOutView) elements.loggedOutView.style.display = 'block';
        if (elements.mainGrid) elements.mainGrid.style.display = 'none';
        if (elements.authSection) elements.authSection.style.display = 'block';
        if (elements.tasksTableBody) elements.tasksTableBody.innerHTML = '<tr><td colspan="7">Faça login para gerenciar tarefas</td></tr>';
    }
});

// Inicialização segura
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema inicializado");

    // Configurar botão de cancelar
    if (elements.cancelEditBtn && elements.taskForm) {
        elements.cancelEditBtn.addEventListener('click', () => {
            elements.taskForm.reset();
            elements.cancelEditBtn.style.display = 'none';
            const submitBtn = elements.taskForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = "Salvar Tarefa";
                delete submitBtn.dataset.taskId;
            }
        });
    }

    // Configurar botão de reset
    if (elements.resetFiltersBtn) {
        elements.resetFiltersBtn.addEventListener('click', () => {
            if (elements.filterStatusSelect) elements.filterStatusSelect.value = "all";
            if (elements.filterAssigneeSelect) elements.filterAssigneeSelect.value = "all";
            if (elements.filterStartDateInput) elements.filterStartDateInput.value = "";
            if (elements.filterEndDateInput) elements.filterEndDateInput.value = "";
            subscribeAndApplyFilters();
            utils.showMessage('Filtros resetados');
        });
    }
});
