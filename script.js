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

// Inicialização do Firebase (Modo compatibilidade)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, orderBy, doc, updateDoc, deleteDoc, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Seleção segura de elementos
function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Elemento #${id} não encontrado`);
    return el;
}

// Elementos da UI (compatíveis com seu HTML)
const ui = {
    // Autenticação
    authSection: document.getElementById('auth-section'),
    loggedInView: document.getElementById('logged-in-view'),
    loggedOutView: document.getElementById('logged-out-view'), // Adicione este ID no seu HTML
    userEmailDisplay: document.getElementById('user-email-display'),
    logoutButton: document.getElementById('logout-button'),
    loginForm: document.getElementById('login-form'), // Adicione este ID no seu HTML
    signupForm: document.getElementById('signup-form'), // Adicione este ID no seu HTML

    // Tarefas
    mainGrid: document.querySelector('.main-grid'),
    taskForm: document.getElementById('task-form'),
    tasksTableBody: document.getElementById('tasks-table-body'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    taskAssigneeSelect: document.getElementById('task-assignee'),
    taskSeiProcess: document.getElementById('task-sei-process'),
    taskDeadline: document.getElementById('task-deadline'),
    taskStatus: document.getElementById('task-status'),
    taskObservations: document.getElementById('task-observations'),

    // Filtros
    filterStatusSelect: document.getElementById('filter-status'),
    filterAssigneeSelect: document.getElementById('filter-assignee'),
    resetFiltersBtn: document.getElementById('reset-filters-btn')
};

// Variáveis de estado
let currentUser = null;
let unsubscribeCallbacks = {
    tasks: null,
    assignees: null
};

// Funções auxiliares
const helpers = {
    showMessage: (text, isError = false) => {
        const msg = document.createElement('div');
        msg.className = `flash-message ${isError ? 'flash-error' : 'flash-success'}`;
        msg.textContent = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    },

    formatDate: (date) => {
        if (!date) return null;
        try {
            return date.toDate ? date.toDate() : new Date(date);
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return null;
        }
    },

    escapeHtml: (text) => {
        if (!text) return '';
        return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};

// Renderização de tarefas (ajustada para seu HTML)
function renderTask(task) {
    if (!ui.tasksTableBody) return;

    const row = document.createElement('tr');
    row.dataset.id = task.id;

    const deadline = helpers.formatDate(task.deadline);
    const isUrgent = deadline && (deadline - new Date()) < 3 * 24 * 60 * 60 * 1000;

    row.innerHTML = `
        <td>${helpers.escapeHtml(task.description)}</td>
        <td>${helpers.escapeHtml(task.type)}</td>
        <td>${helpers.escapeHtml(task.seiProcess || '-')}</td>
        <td>${helpers.escapeHtml(task.assignee)}</td>
        <td class="${isUrgent ? 'urgent' : ''}">
            ${deadline ? deadline.toLocaleDateString('pt-BR') : '-'}
        </td>
        <td><span class="status ${task.status.replace(/\s/g, '-')}">${task.status}</span></td>
        <td>${helpers.escapeHtml(task.observations || '')}</td>
    `;

    if (task.userId === currentUser?.uid) {
        row.addEventListener('click', () => editTask(task.id));
        row.style.cursor = 'pointer';
    }

    ui.tasksTableBody.appendChild(row);
}

// Atualizar dashboard
async function updateDashboard() {
    try {
        const snapshot = await getDocs(collection(db, "tarefas"));
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const updateSummary = (element, key) => {
            if (!element) return;
            const counts = tasks.reduce((acc, task) => {
                const value = task[key] || 'Não definido';
                acc[value] = (acc[value] || 0) + 1;
                return acc;
            }, {});
            
            element.innerHTML = Object.entries(counts)
                .map(([name, count]) => `
                    <div class="summary-item">
                        <span>${name}:</span>
                        <strong>${count}</strong>
                    </div>
                `).join('');
        };

        updateSummary(ui.statusSummary, 'status');
        updateSummary(ui.typeSummary, 'type');
        updateSummary(ui.assigneeSummary, 'assignee');

    } catch (error) {
        console.error("Erro no dashboard:", error);
    }
}

// Gerenciamento de tarefas
function setupTasksListener() {
    if (unsubscribeCallbacks.tasks) unsubscribeCallbacks.tasks();

    // Base query
    let q = query(collection(db, "tarefas"), orderBy("createdAt", "desc"));

    // Aplicar filtros
    const statusFilter = ui.filterStatusSelect?.value;
    const assigneeFilter = ui.filterAssigneeSelect?.value;

    if (statusFilter && statusFilter !== "all") {
        q = query(q, where("status", "==", statusFilter));
    }

    if (assigneeFilter && assigneeFilter !== "all") {
        q = query(q, where("assignee", "==", assigneeFilter));
    }

    unsubscribeCallbacks.tasks = onSnapshot(q, (snapshot) => {
        ui.tasksTableBody.innerHTML = '';
        
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
                userId: data.userId
            });
        });

        updateDashboard();
    });
}

// Autenticação
function setupAuth() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;

        if (user) {
            // Atualizar UI
            if (ui.userEmailDisplay) ui.userEmailDisplay.textContent = user.email;
            if (ui.loggedInView) ui.loggedInView.style.display = 'flex';
            if (ui.loggedOutView) ui.loggedOutView.style.display = 'none';
            if (ui.mainGrid) ui.mainGrid.style.display = 'grid';
            if (ui.authSection) ui.authSection.style.display = 'none';

            // Carregar dados
            setupTasksListener();

        } else {
            // Resetar UI
            if (ui.loggedInView) ui.loggedInView.style.display = 'none';
            if (ui.loggedOutView) ui.loggedOutView.style.display = 'block';
            if (ui.mainGrid) ui.mainGrid.style.display = 'none';
            if (ui.authSection) ui.authSection.style.display = 'block';
            if (ui.tasksTableBody) ui.tasksTableBody.innerHTML = '<tr><td colspan="7">Faça login para ver tarefas</td></tr>';
        }
    });

    // Configurar formulários
    if (ui.loginForm) {
        ui.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(
                    auth,
                    ui.loginForm.querySelector('#login-email').value,
                    ui.loginForm.querySelector('#login-password').value
                );
            } catch (error) {
                helpers.showMessage('Login falhou: ' + error.message, true);
            }
        });
    }

    if (ui.signupForm) {
        ui.signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await createUserWithEmailAndPassword(
                    auth,
                    ui.signupForm.querySelector('#signup-email').value,
                    ui.signupForm.querySelector('#signup-password').value
                );
            } catch (error) {
                helpers.showMessage('Cadastro falhou: ' + error.message, true);
            }
        });
    }

    if (ui.logoutButton) {
        ui.logoutButton.addEventListener('click', () => signOut(auth));
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema iniciado");
    setupAuth();
    
    // Configurar filtros
    if (ui.filterStatusSelect) {
        ui.filterStatusSelect.addEventListener('change', setupTasksListener);
    }

    if (ui.resetFiltersBtn) {
        ui.resetFiltersBtn.addEventListener('click', () => {
            if (ui.filterStatusSelect) ui.filterStatusSelect.value = "all";
            setupTasksListener();
        });
    }
});
