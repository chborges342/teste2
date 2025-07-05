// script.js

// ----------------------------------------------------
// 1. Configuração do Firebase
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyASeIQJoEC5FmH3N85uf0O93ngYxvFS-T8",
    authDomain: "gestaotarefas-862e0.firebaseapp.com",
    projectId: "gestaotarefas-862e0",
    storageBucket: "gestaotarefas-862e0.appspot.com",
    messagingSenderId: "425723057663",
    appId: "1:425723057663:web:c2e145985690b8c24fc3ca"
};

// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, orderBy, doc, updateDoc, deleteDoc, where, getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ----------------------------------------------------
// 2. Referências aos Elementos HTML
// ----------------------------------------------------
// Autenticação
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

// Tarefas
const taskForm = document.getElementById('task-form');
const tasksTableBody = document.getElementById('tasks-table-body');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Filtros
const taskAssigneeSelect = document.getElementById('task-assignee');
const filterStatusSelect = document.getElementById('filter-status');
const filterAssigneeSelect = document.getElementById('filter-assignee');
const taskSeiProcessInput = document.getElementById('task-sei-process');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Variáveis de Estado
let currentUserId = null;
let currentUserEmail = null;
let assigneeListenerUnsubscribe = null;
let tasksListenerUnsubscribe = null;

// ----------------------------------------------------
// 3. Funções Auxiliares
// ----------------------------------------------------
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

// ----------------------------------------------------
// 4. Autenticação
// ----------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!email || !password) {
        showMessage('Preencha todos os campos', true);
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginErrorDisplay.textContent = '';
    } catch (error) {
        console.error("Erro no login:", error);
        loginErrorDisplay.textContent = "E-mail ou senha inválidos.";
        showMessage('Erro no login: ' + error.message, true);
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value.trim();

    if (!email || !password) {
        showMessage('Preencha todos os campos', true);
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        signupErrorDisplay.textContent = '';
    } catch (error) {
        console.error("Erro no cadastro:", error);
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

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserEmail = user.email;
        userEmailDisplay.textContent = user.email;
        loggedInView.style.display = 'block';
        loggedOutView.style.display = 'none';
        document.querySelector('main').style.display = 'block';
        document.getElementById('auth-section').style.display = 'none';

        subscribeAssigneeSelect();
        subscribeAndApplyFilters();
    } else {
        currentUserId = null;
        currentUserEmail = null;
        userEmailDisplay.textContent = '';
        loggedInView.style.display = 'none';
        loggedOutView.style.display = 'block';
        document.querySelector('main').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';

        unsubscribeAssigneeSelect();
        unsubscribeFromTasks();
        tasksTableBody.innerHTML = '<tr><td colspan="10">Faça login para ver e gerenciar tarefas.</td></tr>';
    }
});

// ----------------------------------------------------
// 5. Gerenciamento de Colaboradores
// ----------------------------------------------------
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

function unsubscribeAssigneeSelect() {
    if (assigneeListenerUnsubscribe) {
        assigneeListenerUnsubscribe();
        assigneeListenerUnsubscribe = null;
    }
}

// ----------------------------------------------------
// 6. CRUD de Tarefas (Compartilhado)
// ----------------------------------------------------
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const description = document.getElementById('task-description').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    
    if (!description || !deadline) {
        showMessage('Descrição e prazo são obrigatórios!', true);
        return;
    }

    const submitButton = taskForm.querySelector('button[type="submit"]');
    const isEditMode = submitButton.textContent.includes("Atualizar");

    const taskData = {
        description,
        type: document.getElementById('task-type').value,
        seiProcess: document.getElementById('task-sei-process').value.trim(),
        assignee: taskAssigneeSelect.value,
        deadline: new Date(`${deadline}T23:59:59`),
        priority: document.getElementById('task-priority').value,
        observations: document.getElementById('task-observations').value.trim(),
        status: document.getElementById('task-status').value,
        updatedAt: new Date(),
        userId: currentUserId, // Para registro, não para controle de acesso
        createdBy: currentUserEmail // Mostra quem criou a tarefa
    };

    if (!isEditMode) {
        taskData.createdAt = new Date();
    }

    try {
        if (isEditMode) {
            await updateDoc(doc(db, "tarefas", submitButton.dataset.taskId), taskData);
            showMessage('Tarefa atualizada com sucesso!');
        } else {
            await addDoc(collection(db, "tarefas"), taskData);
            showMessage('Tarefa adicionada com sucesso!');
        }
        
        taskForm.reset();
        submitButton.textContent = "Salvar Tarefa";
        delete submitButton.dataset.taskId;
        
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    } catch (error) {
        console.error("Erro ao salvar tarefa:", error);
        showMessage(`Erro ao ${isEditMode ? 'atualizar' : 'salvar'} tarefa: ${error.message}`, true);
    }
});

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        taskForm.reset();
        cancelEditBtn.style.display = 'none';
        const submitButton = taskForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Salvar Tarefa";
        delete submitButton.dataset.taskId;
    });
}

function renderTask(task) {
    try {
        const row = tasksTableBody.insertRow();
        row.setAttribute('data-id', task.id);
        
        const deadlineDate = formatFirebaseDate(task.deadline);
        const deadlineFormatted = deadlineDate ? deadlineDate.toLocaleDateString('pt-BR') : 'N/A';
        
        const isOwner = task.userId === currentUserId;
        const ownerBadge = isOwner ? '<span class="owner-badge">(Sua tarefa)</span>' : '';

        row.innerHTML = `
            <td>${escapeHtml(task.description)} ${ownerBadge}</td>
            <td>${escapeHtml(task.type)}</td>
            <td>${escapeHtml(task.seiProcess)}</td>
            <td>${escapeHtml(task.assignee)}</td>
            <td>${deadlineFormatted}</td>
            <td>${escapeHtml(task.priority)}</td>
            <td>${escapeHtml(task.observations)}</td>
            <td><span class="status status-${(task.status || '').replace(/\s/g, '-')}">${escapeHtml(task.status)}</span></td>
            <td>${escapeHtml(task.createdBy || 'Sistema')}</td>
            <td class="action-buttons">
                <button class="edit-btn" data-id="${task.id}" ${!isOwner ? 'disabled' : ''}>✏️</button>
                <button class="delete-btn" data-id="${task.id}" ${!isOwner ? 'disabled' : ''}>🗑️</button>
            </td>
        `;

        if (isOwner) {
            row.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
            row.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
        }
    } catch (error) {
        console.error("Erro ao renderizar tarefa:", error);
    }
}

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
        document.getElementById('task-priority').value = taskData.priority || '';
        document.getElementById('task-observations').value = taskData.observations || '';
        document.getElementById('task-status').value = taskData.status || 'Não Iniciado';

        const submitButton = taskForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Atualizar Tarefa";
        submitButton.dataset.taskId = id;
        
        if (cancelEditBtn) cancelEditBtn.style.display = 'block';
        
        document.getElementById('cadastro-tarefa').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error("Erro ao carregar tarefa:", error);
        showMessage('Erro ao carregar tarefa: ' + error.message, true);
    }
}

async function deleteTask(id) {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    
    try {
        await deleteDoc(doc(db, "tarefas", id));
        showMessage('Tarefa excluída com sucesso!');
    } catch (error) {
        console.error("Erro ao excluir tarefa:", error);
        showMessage('Erro ao excluir tarefa: ' + error.message, true);
    }
}

// ----------------------------------------------------
// 7. Filtros Compartilhados
// ----------------------------------------------------
function subscribeAndApplyFilters() {
    if (tasksListenerUnsubscribe) tasksListenerUnsubscribe();

    try {
        let q = query(
            collection(db, "tarefas"),
            orderBy("createdAt", "desc")
        );

        const selectedStatus = filterStatusSelect.value;
        const selectedAssignee = filterAssigneeSelect.value;
        const startDate = filterStartDateInput.value;
        const endDate = filterEndDateInput.value;

        if (selectedStatus !== "all") q = query(q, where("status", "==", selectedStatus));
        if (selectedAssignee !== "all") q = query(q, where("assignee", "==", selectedAssignee));
        if (startDate) q = query(q, where("deadline", ">=", new Date(`${startDate}T00:00:00`)));
        if (endDate) q = query(q, where("deadline", "<=", new Date(`${endDate}T23:59:59`)));

        tasksListenerUnsubscribe = onSnapshot(q, 
            (snapshot) => {
                tasksTableBody.innerHTML = '';
                
                if (snapshot.empty) {
                    tasksTableBody.innerHTML = '<tr><td colspan="10">Nenhuma tarefa encontrada.</td></tr>';
                    return;
                }

                snapshot.forEach((doc) => {
                    try {
                        const task = { 
                            id: doc.id,
                            description: doc.data().description || '',
                            type: doc.data().type || '',
                            seiProcess: doc.data().seiProcess || '',
                            assignee: doc.data().assignee || '',
                            deadline: doc.data().deadline || null,
                            priority: doc.data().priority || '',
                            observations: doc.data().observations || '',
                            status: doc.data().status || 'Não Iniciado',
                            userId: doc.data().userId || '',
                            createdBy: doc.data().createdBy || 'Sistema'
                        };
                        renderTask(task);
                    } catch (error) {
                        console.error("Erro ao processar documento:", error);
                    }
                });
            },
            (error) => {
                console.error("Erro na consulta:", error);
                tasksTableBody.innerHTML = '<tr><td colspan="10">Erro ao carregar tarefas.</td></tr>';
                showMessage('Erro ao carregar tarefas. Verifique o console.', true);
            }
        );
    } catch (error) {
        console.error("Erro ao configurar filtros:", error);
        showMessage('Erro na configuração dos filtros', true);
    }
}

function unsubscribeFromTasks() {
    if (tasksListenerUnsubscribe) {
        tasksListenerUnsubscribe();
        tasksListenerUnsubscribe = null;
    }
}

resetFiltersBtn.addEventListener('click', () => {
    filterStatusSelect.value = "all";
    filterAssigneeSelect.value = "all";
    filterStartDateInput.value = "";
    filterEndDateInput.value = "";
    subscribeAndApplyFilters();
    showMessage('Filtros resetados!');
});

filterStatusSelect.addEventListener('change', subscribeAndApplyFilters);
filterAssigneeSelect.addEventListener('change', subscribeAndApplyFilters);
filterStartDateInput.addEventListener('change', subscribeAndApplyFilters);
filterEndDateInput.addEventListener('change', subscribeAndApplyFilters);

// ----------------------------------------------------
// 8. Inicialização
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("Aplicativo carregado!");
    subscribeAndApplyFilters();
});
