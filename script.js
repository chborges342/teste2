// script.js

// ----------------------------------------------------
// 1. Configuração do Firebase
// ----------------------------------------------------
// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyASeIQJoEC5FmH3N85uf0O93ngYxvFS-T8",
    authDomain: "gestaotarefas-862e0.firebaseapp.com",
    projectId: "gestaotarefas-862e0",
    storageBucket: "gestaotarefas-862e0.appspot.com",
    messagingSenderId: "425723057663",
    appId: "1:425723057663:web:c2e145985690b8c24fc3ca"
};

// Importações do Firebase (Modo Módulo ES6)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, orderBy, doc, updateDoc, deleteDoc, where, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elementos da UI
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutButton = document.getElementById('logout-button');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorDisplay = document.getElementById('login-error');
const signupForm = document.getElementById('signup-form');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupErrorDisplay = document.getElementById('signup-error');
const taskForm = document.getElementById('task-form');
const tasksTableBody = document.getElementById('tasks-table-body');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const taskAssigneeSelect = document.getElementById('task-assignee');
const filterStatusSelect = document.getElementById('filter-status');
const filterAssigneeSelect = document.getElementById('filter-assignee');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Variáveis de Estado
let currentUserId = null;
let currentUserEmail = null;
let assigneeListenerUnsubscribe = null;
let tasksListenerUnsubscribe = null;

// Funções Auxiliares
function showMessage(message, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flash-message ${isError ? 'flash-error' : 'flash-success'}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => messageDiv.remove(), 3000);
}

function formatFirebaseDate(date) {
    if (!date) return null;
    try {
        if (date instanceof Date) return date;
        if (typeof date.toDate === 'function') return date.toDate();
        return new Date(date);
    } catch (error) {
        console.error("Erro ao formatar data:", error);
        return null;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isDeadlineClose(deadlineDate) {
    const today = new Date();
    const deadline = formatFirebaseDate(deadlineDate);
    if (!deadline) return false;
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 3; // Destaque se faltar 3 dias ou menos
}

// Renderização da Tarefa (Atualizada para o novo layout)
function renderTask(task) {
    const row = document.createElement('tr');
    row.setAttribute('data-id', task.id);
    
    const deadlineDate = formatFirebaseDate(task.deadline);
    const deadlineFormatted = deadlineDate ? deadlineDate.toLocaleDateString('pt-BR') : 'N/A';
    const isCloseDeadline = isDeadlineClose(task.deadline);

    row.innerHTML = `
        <td class="${isCloseDeadline ? 'deadline-close' : ''}">${escapeHtml(task.description)}</td>
        <td>${escapeHtml(task.type)}</td>
        <td>${escapeHtml(task.seiProcess || 'N/A')}</td>
        <td>${escapeHtml(task.assignee)}</td>
        <td class="${isCloseDeadline ? 'deadline-close' : ''}">${deadlineFormatted}</td>
        <td class="status-cell"><span class="status-pill status-${task.status.replace(/\s/g, '-')}">${task.status}</span></td>
        <td class="observations-cell">${escapeHtml(task.observations || '')}</td>
    `;

    if (task.userId === currentUserId) {
        row.addEventListener('click', () => editTask(task.id));
        row.style.cursor = 'pointer';
    }

    tasksTableBody.appendChild(row);
}

// Dashboard (Novo)
async function updateDashboard() {
    try {
        const q = query(collection(db, "tarefas"));
        const tasksSnapshot = await getDocs(q);
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Resumo por Status
        const statusSummary = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        renderSummaryChart('status-summary', statusSummary);

        // Resumo por Tipo
        const typeSummary = tasks.reduce((acc, task) => {
            acc[task.type] = (acc[task.type] || 0) + 1;
            return acc;
        }, {});

        renderSummaryChart('type-summary', typeSummary);

        // Resumo por Colaborador
        const assigneeSummary = tasks.reduce((acc, task) => {
            if (task.assignee) {
                acc[task.assignee] = (acc[task.assignee] || 0) + 1;
            }
            return acc;
        }, {});

        renderSummaryChart('assignee-summary', assigneeSummary);

    } catch (error) {
        console.error("Erro ao atualizar dashboard:", error);
    }
}

function renderSummaryChart(elementId, data) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

    sortedEntries.forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.innerHTML = `
            <span class="summary-label">${key}:</span>
            <span class="summary-value">${value}</span>
            <div class="summary-bar" style="width: ${(value / Math.max(...Object.values(data))) * 100}%"></div>
        `;
        container.appendChild(item);
    });
}

// Filtros (Atualizado)
function subscribeAndApplyFilters() {
    if (tasksListenerUnsubscribe) tasksListenerUnsubscribe();

    try {
        let q = query(collection(db, "tarefas"), orderBy("createdAt", "desc"));

        // Aplicar filtros
        if (filterStatusSelect.value !== "all") {
            q = query(q, where("status", "==", filterStatusSelect.value));
        }
        
        if (filterAssigneeSelect.value !== "all") {
            q = query(q, where("assignee", "==", filterAssigneeSelect.value));
        }
        
        if (filterStartDateInput.value) {
            q = query(q, where("deadline", ">=", new Date(filterStartDateInput.value)));
        }
        
        if (filterEndDateInput.value) {
            const endDate = new Date(filterEndDateInput.value);
            endDate.setHours(23, 59, 59);
            q = query(q, where("deadline", "<=", endDate));
        }

        tasksListenerUnsubscribe = onSnapshot(q, (snapshot) => {
            tasksTableBody.innerHTML = '';
            
            if (snapshot.empty) {
                tasksTableBody.innerHTML = '<tr><td colspan="7">Nenhuma tarefa encontrada.</td></tr>';
                return;
            }

            snapshot.forEach((doc) => {
                const task = { 
                    id: doc.id,
                    ...doc.data(),
                    description: doc.data().description || '',
                    type: doc.data().type || '',
                    seiProcess: doc.data().seiProcess || '',
                    assignee: doc.data().assignee || '',
                    observations: doc.data().observations || '',
                    status: doc.data().status || 'Não Iniciado'
                };
                renderTask(task);
            });

            updateDashboard();
        });

    } catch (error) {
        console.error("Erro na consulta:", error);
        tasksTableBody.innerHTML = '<tr><td colspan="7">Erro ao carregar tarefas.</td></tr>';
        showMessage('Erro ao aplicar filtros. Verifique o console.', true);
    }
}

// CRUD de Tarefas (Atualizado)
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const description = document.getElementById('task-description').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    
    if (!description || !deadline) {
        showMessage('Descrição e prazo são obrigatórios!', true);
        return;
    }

    const isEditMode = taskForm.querySelector('button[type="submit"]').textContent.includes("Atualizar");

    const taskData = {
        description,
        type: document.getElementById('task-type').value,
        seiProcess: document.getElementById('task-sei-process').value.trim(),
        assignee: taskAssigneeSelect.value,
        deadline: new Date(`${deadline}T23:59:59`),
        observations: document.getElementById('task-observations').value.trim(),
        status: document.getElementById('task-status').value,
        updatedAt: new Date(),
        userId: currentUserId,
        createdBy: currentUserEmail
    };

    try {
        if (isEditMode) {
            await updateDoc(doc(db, "tarefas", taskForm.querySelector('button[type="submit"]').dataset.taskId), taskData);
            showMessage('Tarefa atualizada com sucesso!');
        } else {
            taskData.createdAt = new Date();
            await addDoc(collection(db, "tarefas"), taskData);
            showMessage('Tarefa adicionada com sucesso!');
        }
        
        taskForm.reset();
        taskForm.querySelector('button[type="submit"]').textContent = "Salvar Tarefa";
        delete taskForm.querySelector('button[type="submit"]').dataset.taskId;
        cancelEditBtn.style.display = 'none';
        
    } catch (error) {
        console.error("Erro ao salvar tarefa:", error);
        showMessage(`Erro ao ${isEditMode ? 'atualizar' : 'salvar'} tarefa: ${error.message}`, true);
    }
});

// Edição de Tarefa
async function editTask(id) {
    try {
        const taskDoc = await getDoc(doc(db, "tarefas", id));
        
        if (!taskDoc.exists()) {
            showMessage('Tarefa não encontrada!', true);
            return;
        }

        const taskData = taskDoc.data();
        const deadlineDate = formatFirebaseDate(taskData.deadline);
        
        document.getElementById('task-description').value = taskData.description || '';
        document.getElementById('task-type').value = taskData.type || '';
        document.getElementById('task-sei-process').value = taskData.seiProcess || '';
        taskAssigneeSelect.value = taskData.assignee || '';
        document.getElementById('task-deadline').value = deadlineDate ? deadlineDate.toISOString().split('T')[0] : '';
        document.getElementById('task-observations').value = taskData.observations || '';
        document.getElementById('task-status').value = taskData.status || 'Não Iniciado';

        const submitButton = taskForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Atualizar Tarefa";
        submitButton.dataset.taskId = id;
        cancelEditBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error("Erro ao carregar tarefa:", error);
        showMessage('Erro ao carregar tarefa: ' + error.message, true);
    }
}

// Cancelar Edição
cancelEditBtn.addEventListener('click', () => {
    taskForm.reset();
    cancelEditBtn.style.display = 'none';
    taskForm.querySelector('button[type="submit"]').textContent = "Salvar Tarefa";
    delete taskForm.querySelector('button[type="submit"]').dataset.taskId;
});

// Autenticação (Mantido igual)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginErrorDisplay.textContent = '';
    } catch (error) {
        loginErrorDisplay.textContent = "E-mail ou senha inválidos.";
        showMessage('Erro no login: ' + error.message, true);
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value.trim();

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        signupErrorDisplay.textContent = '';
    } catch (error) {
        signupErrorDisplay.textContent = error.message;
        showMessage('Erro no cadastro: ' + error.message, true);
    }
});

logoutButton.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error("Erro ao fazer logout:", error);
        showMessage('Erro ao fazer logout', true);
    });
});

// Gerenciamento de Colaboradores
function subscribeAssigneeSelect() {
    if (assigneeListenerUnsubscribe) assigneeListenerUnsubscribe();

    const q = query(collection(db, "colaboradores"), orderBy("name"));
    assigneeListenerUnsubscribe = onSnapshot(q, 
        (snapshot) => {
            taskAssigneeSelect.innerHTML = '<option value="">Selecione um colaborador</option>';
            filterAssigneeSelect.innerHTML = '<option value="all">Todos</option>';
            
            snapshot.forEach((doc) => {
                const collaborator = doc.data();
                const option = document.createElement('option');
                option.value = collaborator.email;
                option.textContent = collaborator.name || collaborator.email;
                taskAssigneeSelect.appendChild(option.cloneNode(true));
                filterAssigneeSelect.appendChild(option);
            });
        },
        (error) => {
            console.error("Erro ao carregar colaboradores:", error);
            showMessage('Erro ao carregar lista de colaboradores', true);
        }
    );
}

// Inicialização
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        userEmailDisplay.textContent = user.email;
        loggedInView.style.display = 'flex';
        loggedOutView.style.display = 'none';
        document.querySelector('.main-grid').style.display = 'grid';
        document.getElementById('auth-section').style.display = 'none';

        subscribeAssigneeSelect();
        subscribeAndApplyFilters();
        updateDashboard();

    } else {
        currentUserId = null;
        currentUserEmail = null;
        loggedInView.style.display = 'none';
        loggedOutView.style.display = 'block';
        document.querySelector('.main-grid').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
        tasksTableBody.innerHTML = '<tr><td colspan="7">Faça login para ver e gerenciar tarefas.</td></tr>';
    }
});

// Event Listeners
filterStatusSelect.addEventListener('change', subscribeAndApplyFilters);
filterAssigneeSelect.addEventListener('change', subscribeAndApplyFilters);
filterStartDateInput.addEventListener('change', subscribeAndApplyFilters);
filterEndDateInput.addEventListener('change', subscribeAndApplyFilters);
resetFiltersBtn.addEventListener('click', () => {
    filterStatusSelect.value = "all";
    filterAssigneeSelect.value = "all";
    filterStartDateInput.value = "";
    filterEndDateInput.value = "";
    subscribeAndApplyFilters();
    showMessage('Filtros resetados!');
});

// Inicialização dos componentes
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema carregado!");
    if (currentUserId) {
        subscribeAndApplyFilters();
    }
});
