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
    query, orderBy, doc, updateDoc, deleteDoc, where, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elementos da UI
const ui = {
    // Autenticação
    authSection: document.getElementById('auth-section'),
    loggedInView: document.getElementById('logged-in-view'),
    loggedOutView: document.getElementById('logged-out-view'),
    userEmailDisplay: document.getElementById('user-email-display'),
    logoutButton: document.getElementById('logout-button'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    showLoginBtn: document.getElementById('show-login'),
    showSignupBtn: document.getElementById('show-signup'),
    cancelLoginBtn: document.getElementById('cancel-login'),
    cancelSignupBtn: document.getElementById('cancel-signup'),

    // Tarefas
    mainGrid: document.querySelector('.main-grid'),
    taskForm: document.getElementById('task-form'),
    tasksGrid: document.getElementById('tasks-grid'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    taskAssigneeSelect: document.getElementById('task-assignee'),

    // Filtros
    filterStatusSelect: document.getElementById('filter-status'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

    // Dashboard
    statusSummary: document.getElementById('status-summary'),
    typeSummary: document.getElementById('type-summary'),
    assigneeSummary: document.getElementById('assignee-summary')
};

// Variáveis de estado
let currentUser = null;
let unsubscribeCallbacks = {
    tasks: null,
    assignees: null
};
let editTaskId = null;

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

// Renderização de tarefas como cards
function renderTask(task) {
    if (!ui.tasksGrid) return;

    const deadline = helpers.formatDate(task.deadline);
    const isUrgent = deadline && (deadline - new Date()) < 3 * 24 * 60 * 60 * 1000;
    const assigneeInitial = task.assignee ? task.assignee.charAt(0).toUpperCase() : '?';

    const taskCard = document.createElement('div');
    taskCard.className = `task-card status-${task.status.replace(/\s/g, '-')} priority-${task.priority || 'Média'}`;
    taskCard.dataset.id = task.id;
    taskCard.dataset.status = task.status;
    taskCard.dataset.priority = task.priority;
    taskCard.dataset.assignee = task.assignee;

    taskCard.innerHTML = `
        <div class="task-card-header">
            <span class="task-type-badge">${task.type || 'Geral'}</span>
            <span class="task-deadline ${isUrgent ? 'urgent' : ''}">
                <i class="far fa-calendar-alt"></i>
                ${deadline ? deadline.toLocaleDateString('pt-BR') : 'Sem prazo'}
            </span>
        </div>
        
        <div class="task-card-body">
            <h3 class="task-title">${helpers.escapeHtml(task.description) || 'Nova Tarefa'}</h3>
            <p class="task-description">${helpers.escapeHtml(task.observations) || 'Nenhuma observação cadastrada'}</p>
            
            ${task.seiProcess ? `
                <div class="task-sei-process">
                    <i class="fas fa-file-alt"></i>
                    Processo SEI: ${helpers.escapeHtml(task.seiProcess)}
                </div>
            ` : ''}
        </div>
        
        <div class="task-card-footer">
            <div class="task-assignee">
                <span class="assignee-avatar">${assigneeInitial}</span>
                <span class="assignee-name">${helpers.escapeHtml(task.assignee) || 'Não atribuído'}</span>
            </div>
            
            <span class="task-status status-${task.status.replace(/\s/g, '-')}">
                ${task.status}
            </span>
            
            <div class="task-actions">
                <button class="btn-edit" data-id="${task.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" data-id="${task.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    ui.tasksGrid.appendChild(taskCard);
}

// Carregar colaboradores
async function loadAssignees() {
    try {
        const snapshot = await getDocs(collection(db, "colaboradores"));
        ui.taskAssigneeSelect.innerHTML = '<option value="">Selecione...</option>';
        const filterAssigneeSelect = document.getElementById('filter-assignee');
        
        if (filterAssigneeSelect) {
            filterAssigneeSelect.innerHTML = '<option value="all">Todos colaboradores</option>';
        }

        snapshot.forEach(doc => {
            const collaborator = doc.data();
            const displayName = collaborator.nome || collaborator.email || 'Colaborador';
            
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = displayName;
            
            ui.taskAssigneeSelect.appendChild(option);
            
            if (filterAssigneeSelect) {
                filterAssigneeSelect.appendChild(option.cloneNode(true));
            }
        });
    } catch (error) {
        console.error("Erro ao carregar colaboradores:", error);
        helpers.showMessage("Erro ao carregar lista de colaboradores", true);
    }
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

    let q = query(collection(db, "tarefas"), orderBy("createdAt", "desc"));

    // Filtro por status
    const statusFilter = ui.filterStatusSelect?.value;
    if (statusFilter && statusFilter !== "all") {
        q = query(q, where("status", "==", statusFilter));
    }

    // Filtro por colaborador
    const assigneeFilter = document.getElementById('filter-assignee')?.value;
    if (assigneeFilter && assigneeFilter !== "all") {
        q = query(q, where("assignee", "==", assigneeFilter));
    }

    // Filtro por intervalo de tempo (CORRIGIDO)
    const startDate = document.getElementById('filter-start-date')?.value;
    const endDate = document.getElementById('filter-end-date')?.value;
    
    if (startDate && endDate) {
        // Quando ambas as datas estão preenchidas
        q = query(
            q,
            where("deadline", ">=", new Date(startDate)),
            where("deadline", "<=", new Date(endDate + "T23:59:59")) // Inclui todo o dia final
        );
    } else if (startDate) {
        // Apenas data inicial
        q = query(q, where("deadline", ">=", new Date(startDate)));
    } else if (endDate) {
        // Apenas data final
        q = query(q, where("deadline", "<=", new Date(endDate + "T23:59:59")));
    }

    unsubscribeCallbacks.tasks = onSnapshot(q, (snapshot) => {
        if (ui.tasksGrid) ui.tasksGrid.innerHTML = '';
        
        const noTasksMsg = document.getElementById('no-tasks-message');
        if (noTasksMsg) {
            noTasksMsg.style.display = snapshot.empty ? 'block' : 'none';
        }

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
                priority: data.priority || 'Média',
                userId: data.userId
            });
        });

        updateDashboard();
    });
}

// Configurar filtros por chips
function setupChipFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const [key, value] = this.dataset.filter.includes(':') 
                ? this.dataset.filter.split(':') 
                : ['all', ''];
            
            if (key === 'all') {
                setupTasksListener();
            } else {
                // Aplica filtro adicional
                let q = query(
                    collection(db, "tarefas"), 
                    where(key, "==", value),
                    orderBy("createdAt", "desc")
                );
                
                if (unsubscribeCallbacks.tasks) unsubscribeCallbacks.tasks();
                unsubscribeCallbacks.tasks = onSnapshot(q, snapshot => {
                    if (ui.tasksGrid) ui.tasksGrid.innerHTML = '';
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        renderTask({
                            id: doc.id,
                            ...data
                        });
                    });
                });
            }
        });
    });
}

// Editar tarefa
async function editTask(taskId) {
    try {
        const docRef = doc(db, "tarefas", taskId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const task = docSnap.data();
            editTaskId = taskId;

            // Preencher formulário
            document.getElementById('task-description').value = task.description;
            document.getElementById('task-type').value = task.type;
            document.getElementById('task-sei-process').value = task.seiProcess || '';
            document.getElementById('task-assignee').value = task.assignee || '';
            
            // Formatar data
            const deadlineDate = task.deadline?.toDate();
            if (deadlineDate) {
                document.getElementById('task-deadline').value = deadlineDate.toISOString().split('T')[0];
            }
            
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-observations').value = task.observations || '';

            // Rolagem suave para o formulário
            document.querySelector('.cadastro-container').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error("Erro ao editar tarefa:", error);
        helpers.showMessage("Erro ao carregar tarefa: " + error.message, true);
    }
}

// Configurar ações de tarefas
function setupTaskActions() {
    document.addEventListener('click', async (e) => {
        // Edição
        if (e.target.closest('.btn-edit')) {
            const taskId = e.target.closest('.btn-edit').dataset.id;
            await editTask(taskId);
        }
        
        // Exclusão
        if (e.target.closest('.btn-delete')) {
            const taskId = e.target.closest('.btn-delete').dataset.id;
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                try {
                    await deleteDoc(doc(db, "tarefas", taskId));
                    helpers.showMessage("Tarefa excluída com sucesso!");
                } catch (error) {
                    helpers.showMessage("Erro ao excluir tarefa: " + error.message, true);
                }
            }
        }
    });
}

// Formulário de tarefas
function setupTaskForm() {
    if (ui.taskForm) {
        ui.taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const taskData = {
                    description: document.getElementById('task-description').value,
                    type: document.getElementById('task-type').value,
                    seiProcess: document.getElementById('task-sei-process').value,
                    assignee: document.getElementById('task-assignee').value,
                    deadline: new Date(document.getElementById('task-deadline').value),
                    status: document.getElementById('task-status').value,
                    priority: document.getElementById('task-priority').value,
                    observations: document.getElementById('task-observations').value,
                    userId: currentUser.uid,
                    createdAt: new Date()
                };

                if (editTaskId) {
                    await updateDoc(doc(db, "tarefas", editTaskId), taskData);
                    helpers.showMessage("Tarefa atualizada!");
                } else {
                    await addDoc(collection(db, "tarefas"), taskData);
                    helpers.showMessage("Tarefa criada!");
                }

                ui.taskForm.reset();
                editTaskId = null;
            } catch (error) {
                console.error("Erro ao salvar tarefa:", error);
                helpers.showMessage("Erro ao salvar tarefa: " + error.message, true);
            }
        });
    }

    if (ui.cancelEditBtn) {
        ui.cancelEditBtn.addEventListener('click', () => {
            ui.taskForm.reset();
            editTaskId = null;
        });
    }
}

// Autenticação
function setupAuth() {
    // Alternar entre login/cadastro
    if (ui.showLoginBtn) {
        ui.showLoginBtn.addEventListener('click', () => {
            ui.loggedOutView.style.display = 'none';
            ui.loginForm.style.display = 'block';
        });
    }

    if (ui.cancelLoginBtn) {
        ui.cancelLoginBtn.addEventListener('click', () => {
            ui.loginForm.style.display = 'none';
            ui.loggedOutView.style.display = 'block';
        });
    }

    if (ui.showSignupBtn) {
        ui.showSignupBtn.addEventListener('click', () => {
            ui.loggedOutView.style.display = 'none';
            ui.signupForm.style.display = 'block';
        });
    }

    if (ui.cancelSignupBtn) {
        ui.cancelSignupBtn.addEventListener('click', () => {
            ui.signupForm.style.display = 'none';
            ui.loggedOutView.style.display = 'block';
        });
    }

    // Listener de estado de autenticação
    onAuthStateChanged(auth, (user) => {
        currentUser = user;

        if (user) {
            // Atualizar UI
            ui.userEmailDisplay.textContent = user.email;
            ui.loggedInView.style.display = 'flex';
            ui.loggedOutView.style.display = 'none';
            ui.mainGrid.style.display = 'grid';
            ui.authSection.style.display = 'none';

            // Carregar dados
            loadAssignees();
            setupTasksListener();

        } else {
            // Resetar UI
            ui.loggedInView.style.display = 'none';
            ui.loggedOutView.style.display = 'block';
            ui.mainGrid.style.display = 'none';
            ui.authSection.style.display = 'block';
            if (ui.tasksGrid) ui.tasksGrid.innerHTML = '';
        }
    });

    // Login
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

    // Cadastro
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

    // Logout
    if (ui.logoutButton) {
        ui.logoutButton.addEventListener('click', () => signOut(auth));
    }
}

// Filtros
function setupFilters() {
    if (ui.filterStatusSelect) {
        ui.filterStatusSelect.addEventListener('change', setupTasksListener);
    }

    const filterAssignee = document.getElementById('filter-assignee');
    if (filterAssignee) {
        filterAssignee.addEventListener('change', setupTasksListener);
    }

    const startDate = document.getElementById('filter-start-date');
    const endDate = document.getElementById('filter-end-date');
    
    if (startDate) {
        startDate.addEventListener('change', setupTasksListener);
    }
    if (endDate) {
        endDate.addEventListener('change', setupTasksListener);
    }

if (ui.resetFiltersBtn) {
    ui.resetFiltersBtn.addEventListener('click', () => {
        if (ui.filterStatusSelect) ui.filterStatusSelect.value = "all";
        if (filterAssignee) filterAssignee.value = "all";
        
        // Limpa os campos de data
        const startDate = document.getElementById('filter-start-date');
        const endDate = document.getElementById('filter-end-date');
        if (startDate) startDate.value = "";
        if (endDate) endDate.value = "";
        
        setupTasksListener();
    });
}
    

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupTaskForm();
    setupTaskActions();
    setupFilters();
    setupChipFilters();
});
