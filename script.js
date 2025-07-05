// script.js

// ----------------------------------------------------
// 1. Configuração do Firebase (substitua pelos seus dados)
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyASeIQJoEC5FmH3N85uf0O93ngYxvFS-T8",
    authDomain: "gestaotarefas-862e0.firebaseapp.com",
    projectId: "gestaotarefas-862e0",
    storageBucket: "gestaotarefas-862e0.firebasestorage.app",
    messagingSenderId: "425723057663",
    appId: "1:425723057663:web:c2e145985690b8c24fc3ca"
};

// Importações do Firebase (SDK v11.10.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, where, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ----------------------------------------------------
// 2. Referências aos Elementos HTML
// ----------------------------------------------------
// Views
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutButton = document.getElementById('logout-button');

// Formulários de Autenticação
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
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Variáveis de Estado
let currentUserId = null;
let assigneeListenerUnsubscribe = null;
let tasksListenerUnsubscribe = null;

// ----------------------------------------------------
// 3. Autenticação (Login, Cadastro, Logout)
// ----------------------------------------------------
// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginErrorDisplay.textContent = '';
        showMessage('Login realizado com sucesso!');
    } catch (error) {
        console.error("Erro no login:", error);
        loginErrorDisplay.textContent = "E-mail ou senha inválidos.";
        showMessage('Erro no login: ' + error.message, true);
    }
});

// Cadastro
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        signupErrorDisplay.textContent = '';
        showMessage('Cadastro realizado com sucesso!');
    } catch (error) {
        console.error("Erro no cadastro:", error);
        signupErrorDisplay.textContent = error.message;
        showMessage('Erro no cadastro: ' + error.message, true);
    }
});

// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        showMessage('Logout realizado com sucesso!');
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
        showMessage('Erro ao fazer logout', true);
    });
});

// ----------------------------------------------------
// 4. Gerenciamento de Estado de Autenticação
// ----------------------------------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        currentUserId = user.uid;
        userEmailDisplay.textContent = user.email;
        loggedInView.style.display = 'block';
        loggedOutView.style.display = 'none';
        document.querySelector('main').style.display = 'block';
        document.getElementById('auth-section').style.display = 'none';

        // Inicia listeners
        subscribeAssigneeSelect();
        subscribeAndApplyFilters();
    } else {
        // Usuário deslogado
        currentUserId = null;
        userEmailDisplay.textContent = '';
        loggedInView.style.display = 'none';
        loggedOutView.style.display = 'block';
        document.querySelector('main').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';

        // Remove listeners
        unsubscribeAssigneeSelect();
        unsubscribeFromTasks();
        tasksTableBody.innerHTML = '<tr><td colspan="9">Faça login para ver e gerenciar tarefas.</td></tr>';
    }
});

// ----------------------------------------------------
// 5. Gerenciamento de Colaboradores
// ----------------------------------------------------
function subscribeAssigneeSelect() {
    if (assigneeListenerUnsubscribe) assigneeListenerUnsubscribe();

    const collaboratorsCol = collection(db, "colaboradores");
    assigneeListenerUnsubscribe = onSnapshot(collaboratorsCol, (snapshot) => {
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
    }, (error) => {
        console.error("Erro ao carregar colaboradores:", error);
        showMessage('Erro ao carregar colaboradores', true);
    });
}

function unsubscribeAssigneeSelect() {
    if (assigneeListenerUnsubscribe) {
        assigneeListenerUnsubscribe();
        assigneeListenerUnsubscribe = null;
    }
}

// ----------------------------------------------------
// 6. Gerenciamento de Tarefas (CRUD)
// ----------------------------------------------------
// Adicionar/Editar Tarefa
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validação
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    if (!description || !deadline) {
        showMessage('Descrição e prazo são obrigatórios!', true);
        return;
    }

    const submitButton = e.target.querySelector('button[type="submit"]');
    const isEditMode = submitButton.textContent.includes("Atualizar");

    const taskData = {
        description: description,
        type: document.getElementById('task-type').value,
        seiProcess: document.getElementById('task-sei-process').value,
        assignee: taskAssigneeSelect.value,
        deadline: new Date(`${deadline}T23:59:59`),
        priority: document.getElementById('task-priority').value,
        observations: document.getElementById('task-observations').value,
        status: document.getElementById('task-status').value,
        createdAt: new Date(),
        userId: currentUserId // Adiciona o ID do usuário criador
    };

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
        cancelEditBtn.style.display = 'none';
    } catch (error) {
        console.error("Erro ao salvar tarefa:", error);
        showMessage('Erro ao salvar tarefa: ' + error.message, true);
    }
});

// Cancelar Edição
cancelEditBtn.addEventListener('click', () => {
    taskForm.reset();
    cancelEditBtn.style.display = 'none';
    taskForm.querySelector('button[type="submit"]').textContent = "Salvar Tarefa";
    delete taskForm.querySelector('button[type="submit"]').dataset.taskId;
});

// Renderizar Tarefa
function renderTask(task) {
    const row = tasksTableBody.insertRow();
    row.setAttribute('data-id', task.id);
    row.innerHTML = `
        <td>${task.description}</td>
        <td>${task.type}</td>
        <td>${task.seiProcess || ''}</td>
        <td>${task.assignee}</td>
        <td>${task.deadline?.toDate().toLocaleDateString('pt-BR') || 'N/A'}</td>
        <td>${task.priority}</td>
        <td>${task.observations || ''}</td>
        <td><span class="status status-${task.status.replace(/\s/g, '-')}">${task.status}</span></td>
        <td class="action-buttons">
            <button class="edit-btn" data-id="${task.id}">✏️</button>
            <button class="delete-btn" data-id="${task.id}">🗑️</button>
        </td>
    `;

    row.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
}

// Editar Tarefa
async function editTask(id) {
    try {
        const taskDoc = await getDoc(doc(db, "tarefas", id));
        if (!taskDoc.exists()) return;

        const taskData = taskDoc.data();
        document.getElementById('task-description').value = taskData.description;
        document.getElementById('task-type').value = taskData.type;
        document.getElementById('task-sei-process').value = taskData.seiProcess || '';
        taskAssigneeSelect.value = taskData.assignee;
        document.getElementById('task-deadline').value = taskData.deadline.toDate().toISOString().split('T')[0];
        document.getElementById('task-priority').value = taskData.priority;
        document.getElementById('task-observations').value = taskData.observations;
        document.getElementById('task-status').value = taskData.status;

        const submitButton = taskForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Atualizar Tarefa";
        submitButton.dataset.taskId = id;
        cancelEditBtn.style.display = 'block';
        
        document.getElementById('cadastro-tarefa').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error("Erro ao carregar tarefa:", error);
        showMessage('Erro ao carregar tarefa para edição', true);
    }
}

// Excluir Tarefa
async function deleteTask(id) {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
        await deleteDoc(doc(db, "tarefas", id));
        showMessage('Tarefa excluída com sucesso!');
    } catch (error) {
        console.error("Erro ao excluir tarefa:", error);
        showMessage('Erro ao excluir tarefa', true);
    }
}

// ----------------------------------------------------
// 7. Filtros
// ----------------------------------------------------
function subscribeAndApplyFilters() {
    if (tasksListenerUnsubscribe) tasksListenerUnsubscribe();

    const selectedStatus = filterStatusSelect.value;
    const selectedAssignee = filterAssigneeSelect.value;
    const startDate = filterStartDateInput.value;
    const endDate = filterEndDateInput.value;

    let q = query(
        collection(db, "tarefas"),
        where("userId", "==", currentUserId), // Filtra por usuário
        orderBy("createdAt", "desc")
    );

    if (selectedStatus !== "all") q = query(q, where("status", "==", selectedStatus));
    if (selectedAssignee !== "all") q = query(q, where("assignee", "==", selectedAssignee));
    if (startDate) q = query(q, where("deadline", ">=", new Date(`${startDate}T00:00:00`)));
    if (endDate) q = query(q, where("deadline", "<=", new Date(`${endDate}T23:59:59`)));

    tasksListenerUnsubscribe = onSnapshot(q, (snapshot) => {
        tasksTableBody.innerHTML = '';
        if (snapshot.empty) {
            tasksTableBody.innerHTML = '<tr><td colspan="9">Nenhuma tarefa encontrada.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const task = { id: doc.id, ...doc.data() };
            renderTask(task);
        });
    }, (error) => {
        console.error("Erro ao carregar tarefas:", error);
        showMessage('Erro ao carregar tarefas', true);
    });
}

function unsubscribeFromTasks() {
    if (tasksListenerUnsubscribe) {
        tasksListenerUnsubscribe();
        tasksListenerUnsubscribe = null;
    }
}

// Resetar Filtros
resetFiltersBtn.addEventListener('click', () => {
    filterStatusSelect.value = "all";
    filterAssigneeSelect.value = "all";
    filterStartDateInput.value = "";
    filterEndDateInput.value = "";
    subscribeAndApplyFilters();
    showMessage('Filtros resetados!');
});

// Event Listeners para Filtros
filterStatusSelect.addEventListener('change', subscribeAndApplyFilters);
filterAssigneeSelect.addEventListener('change', subscribeAndApplyFilters);
filterStartDateInput.addEventListener('change', subscribeAndApplyFilters);
filterEndDateInput.addEventListener('change', subscribeAndApplyFilters);

// ----------------------------------------------------
// 8. Utilitários
// ----------------------------------------------------
function showMessage(message, isError = false) {
    const msgDiv = document.createElement('div');
    msgDiv.textContent = message;
    msgDiv.style.position = 'fixed';
    msgDiv.style.top = '20px';
    msgDiv.style.right = '20px';
    msgDiv.style.padding = '10px 20px';
    msgDiv.style.background = isError ? '#ff4444' : '#4CAF50';
    msgDiv.style.color = 'white';
    msgDiv.style.borderRadius = '5px';
    msgDiv.style.zIndex = '1000';
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
}

// ----------------------------------------------------
// 9. Inicialização
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("Aplicativo carregado!");
});


