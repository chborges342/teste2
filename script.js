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
import { Timestamp } from "firebase/firestore"; 



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
    filterStartDate: document.getElementById('filter-start-date'),
    filterEndDate: document.getElementById('filter-end-date'),
    dateFilterIndicator: document.getElementById('date-filter-indicator'),
    quickFilterWeek: document.getElementById('quick-filter-week'),

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
    },

    setDateFilterActive: (isActive) => {
        if (ui.dateFilterIndicator) {
            ui.dateFilterIndicator.style.display = isActive ? 'inline-block' : 'none';
        }
        if (ui.filterStartDate && ui.filterEndDate) {
            if (isActive) {
                ui.filterStartDate.classList.add('date-filter-active');
                ui.filterEndDate.classList.add('date-filter-active');
            } else {
                ui.filterStartDate.classList.remove('date-filter-active');
                ui.filterEndDate.classList.remove('date-filter-active');
            }
        }
    }
};

// Renderização de tarefas
function renderTask(task) {
    // Converter timestamp do Firestore para Date se necessário
    const deadline = task.deadline instanceof Timestamp 
        ? task.deadline.toDate() 
        : helpers.formatDate(task.deadline);
    
    // Restante da função permanece igual...
}
    const taskCard = document.createElement('div');
    taskCard.className = `task-card status-${task.status.replace(/\s/g, '-')} priority-${task.priority || 'Média'} ${isUrgent ? 'urgent' : ''}`;
    taskCard.dataset.id = task.id;
    taskCard.dataset.status = task.status;
    taskCard.dataset.priority = task.priority;
    taskCard.dataset.assignee = task.assignee;
    taskCard.dataset.deadline = deadline ? deadline.toISOString() : '';

    taskCard.innerHTML = `
        <div class="task-card-header">
            <span class="task-type-badge">${task.type || 'Geral'}</span>
            <span class="task-deadline ${isUrgent ? 'urgent' : ''}">
                <i class="far fa-calendar-alt"></i>
                ${deadline ? deadline.toLocaleDateString('pt-BR') : 'Sem prazo'}
            </span>
        </div>
        
        <div class="task-card-body">
            <h3 class="task-title">${task.description || 'Nova Tarefa'}</h3>
            <p class="task-description">${task.observations || 'Nenhuma observação cadastrada'}</p>
            
            ${task.seiProcess ? `
                <div class="task-sei-process">
                    <i class="fas fa-file-alt"></i>
                    Processo SEI: ${task.seiProcess}
                </div>
            ` : ''}
        </div>
        
        <div class="task-card-footer">
            <div class="task-assignee">
                <span class="assignee-avatar">${assigneeInitial}</span>
                <span class="assignee-name">${task.assignee || 'Não atribuído'}</span>
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

    // Filtro por data (versão corrigida e testada)
    const startDate = ui.filterStartDate?.value;
    const endDate = ui.filterEndDate?.value;
    
    if (startDate || endDate) {
        try {
            // Converter para timestamp do Firebase
            const startTimestamp = startDate ? firebase.firestore.Timestamp.fromDate(new Date(startDate)) : null;
            const endTimestamp = endDate ? firebase.firestore.Timestamp.fromDate(new Date(endDate + "T23:59:59")) : null;
            
            if (startTimestamp && endTimestamp) {
                q = query(q, 
                    where("deadline", ">=", startTimestamp),
                    where("deadline", "<=", endTimestamp)
                );
                helpers.setDateFilterActive(true);
            } else if (startTimestamp) {
                q = query(q, where("deadline", ">=", startTimestamp));
                helpers.setDateFilterActive(true);
            } else if (endTimestamp) {
                q = query(q, where("deadline", "<=", endTimestamp));
                helpers.setDateFilterActive(true);
            }
        } catch (error) {
            console.error("Erro no filtro de datas:", error);
            helpers.showMessage("Erro ao aplicar filtro de datas: " + error.message, true);
            helpers.setDateFilterActive(false);
        }
    } else {
        helpers.setDateFilterActive(false);
    }

    unsubscribeCallbacks.tasks = onSnapshot(q, (snapshot) => {
        ui.tasksGrid.innerHTML = '';
        
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
    }, (error) => {
        console.error("Erro ao carregar tarefas:", error);
        helpers.showMessage("Erro ao carregar tarefas", true);
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
                let q = query(
                    collection(db, "tarefas"), 
                    where(key, "==", value),
                    orderBy("createdAt", "desc")
                );
                
                if (unsubscribeCallbacks.tasks) unsubscribeCallbacks.tasks();
                unsubscribeCallbacks.tasks = onSnapshot(q, snapshot => {
                    ui.tasksGrid.innerHTML = '';
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

// Configurar filtro rápido (últimos 7 dias)
function setupQuickFilters() {
    if (ui.quickFilterWeek) {
        ui.quickFilterWeek.addEventListener('click', () => {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);
            
            ui.filterStartDate.value = startDate.toISOString().split('T')[0];
            ui.filterEndDate.value = endDate.toISOString().split('T')[0];
            
            setupTasksListener();
        });
    }
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
            const deadlineDate = helpers.formatDate(task.deadline);
            if (deadlineDate) {
                document.getElementById('task-deadline').value = deadlineDate.toISOString().split('T')[0];
            }
            
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-observations').value = task.observations || '';

            // Rolagem suave
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
                const deadlineValue = document.getElementById('task-deadline').value;
                const deadline = deadlineValue ? new Date(deadlineValue) : null;
                
                const taskData = {
                    description: document.getElementById('task-description').value,
                    type: document.getElementById('task-type').value,
                    seiProcess: document.getElementById('task-sei-process').value,
                    assignee: document.getElementById('task-assignee').value,
                    deadline: deadline,
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

    function setupAuth() {
    // ... (mantenha o código existente de alternância entre telas)

    // Corrija o listener de estado de autenticação
    onAuthStateChanged(auth, (user) => {
        console.log("[DEBUG] Estado de autenticação:", user); // Log para debug
        
        currentUser = user;
        if (user) {
            console.log("[DEBUG] Usuário logado:", user.email);
            ui.userEmailDisplay.textContent = user.email;
            ui.loggedInView.style.display = 'flex';
            ui.loggedOutView.style.display = 'none';
            ui.mainGrid.style.display = 'grid';
            ui.authSection.style.display = 'none';
            
            // Carregue os dados apenas se for a primeira vez
            if (!unsubscribeCallbacks.tasks) {
                loadAssignees();
                setupTasksListener();
            }
        } else {
            console.log("[DEBUG] Nenhum usuário logado");
            ui.loggedInView.style.display = 'none';
            ui.loggedOutView.style.display = 'block';
            ui.mainGrid.style.display = 'none';
            ui.authSection.style.display = 'block';
            
            // Limpe os listeners ao deslogar
            if (unsubscribeCallbacks.tasks) {
                unsubscribeCallbacks.tasks();
                unsubscribeCallbacks.tasks = null;
            }
        }
    });

    // Corrija o formulário de login
    if (ui.loginForm) {
        ui.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = ui.loginForm.querySelector('#login-email').value;
            const password = ui.loginForm.querySelector('#login-password').value;
            
            try {
                // Mostre um feedback visual
                const submitBtn = ui.loginForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
                
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("[ERRO] Falha no login:", error);
                let errorMsg = "Erro ao fazer login: ";
                switch(error.code) {
                    case 'auth/invalid-email':
                        errorMsg += "E-mail inválido";
                        break;
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMsg += "E-mail ou senha incorretos";
                        break;
                    default:
                        errorMsg += error.message;
                }
                helpers.showMessage(errorMsg, true);
            } finally {
                if (ui.loginForm) {
                    const submitBtn = ui.loginForm.querySelector('button[type="submit"]');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                }
            }
        });
    }
    
    // ... (mantenha o restante do código existente)
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
    
    if (ui.filterStartDate) {
        ui.filterStartDate.addEventListener('change', function() {
            if (this.value && ui.filterEndDate.value && this.value > ui.filterEndDate.value) {
                helpers.showMessage("Data inicial não pode ser maior que data final", true);
                this.value = '';
                return;
            }
            setupTasksListener();
        });
    }
    
    if (ui.filterEndDate) {
        ui.filterEndDate.addEventListener('change', function() {
            if (this.value && ui.filterStartDate.value && this.value < ui.filterStartDate.value) {
                helpers.showMessage("Data final não pode ser menor que data inicial", true);
                this.value = '';
                return;
            }
            setupTasksListener();
        });
    }

    if (ui.resetFiltersBtn) {
        ui.resetFiltersBtn.addEventListener('click', () => {
            if (ui.filterStatusSelect) ui.filterStatusSelect.value = "all";
            if (filterAssignee) filterAssignee.value = "all";
            if (ui.filterStartDate) ui.filterStartDate.value = "";
            if (ui.filterEndDate) ui.filterEndDate.value = "";
            setupTasksListener();
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupTaskForm();
    setupTaskActions();
    setupFilters();
    setupChipFilters();
    setupQuickFilters();
    
    // Configura data mínima para os inputs de data
    const today = new Date().toISOString().split('T')[0];
    if (ui.filterStartDate) ui.filterStartDate.min = "2000-01-01";
    if (ui.filterEndDate) ui.filterEndDate.min = "2000-01-01";
});
