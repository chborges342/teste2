// script.js

// ----------------------------------------------------
// Passo 1: Configuração e Inicialização do Firebase
// Lembre-se de substituir os valores pelos do seu projeto Firebase!
// Você pode encontrar esses valores no Console do Firebase:
// Configurações do Projeto -> Seus apps -> Adicionar aplicativo
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyASeIQJoEC5FmH3N85uf0O93ngYxvFS-T8",
    authDomain: "gestaotarefas-862e0.firebaseapp.com",
    projectId: "gestaotarefas-862e0",
    storageBucket: "gestaotarefas-862e0.firebasestorage.app",
    messagingSenderId: "425723057663",
    appId: "1:425723057663:web:c2e145985690b8c24fc3ca"
};

// Importar os serviços do Firebase que vamos usar
// Atenção: Atualizei as versões do SDK para 11.10.0 para corresponder ao seu snippet!
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, where, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Importado mas não usado ativamente no exemplo do CRUD de tarefas

// ----------------------------------------------------
// Passo 2: Referências aos Elementos HTML
// ----------------------------------------------------
const taskForm = document.getElementById('task-form');
const tasksTableBody = document.getElementById('tasks-table-body');
const taskAssigneeSelect = document.getElementById('task-assignee');
const filterStatusSelect = document.getElementById('filter-status');
const filterAssigneeSelect = document.getElementById('filter-assignee');
const taskSeiProcessInput = document.getElementById('task-sei-process');
// NOVAS REFERÊNCIAS PARA OS FILTROS DE DATA
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');


let currentUserId = null; // Para armazenar o ID do usuário logado


// ----------------------------------------------------
// Passo 3: Funções de Autenticação (Exemplo Básico)
// Para seu sistema, você precisará de uma tela de login/cadastro
// Aqui, vou mostrar como você pode autenticar um usuário
// e usar o ID dele para associar tarefas.
// ----------------------------------------------------

// Exemplo: Login anônimo para testar (NÃO USE EM PRODUÇÃO!)
// onAuthStateChanged(auth, (user) => {
//     if (user) {
//         currentUserId = user.uid;
//         console.log("Usuário autenticado:", user.email || "Anônimo", user.uid);
//         // Carregar colaboradores e tarefas após a autenticação
//         populateAssigneeSelect();
//         listenForTasks();
//     } else {
//         console.log("Nenhum usuário logado. Tentando login anônimo...");
//         signInAnonymously(auth)
//             .then(() => {
//                 // Logado
//             })
//             .catch((error) => {
//                 console.error("Erro no login anônimo:", error);
//             });
//     }
// });

// Para um sistema real, você precisaria de:
// 1. Uma interface de cadastro e login.
// 2. Funções como createUserWithEmailAndPassword(auth, email, password)
// 3. Funções como signInWithEmailAndPassword(auth, email, password)
// Para este exemplo, vamos simular que um usuário está logado e que os colaboradores
// são gerenciados em uma coleção separada ou no próprio Authentication.
// Por simplicidade, para iniciar, vamos usar um usuário fixo ou deixar a atribuição livre.
// Para testar sem login, comente o bloco acima e chame `populateAssigneeSelect()` e `listenForTasks()` diretamente.
// Para os colaboradores, podemos buscar uma lista de usuários (se você tiver uma coleção `users` no Firestore)

// ----------------------------------------------------
// Passo 4: Carregar Colaboradores (Exemplo)
// ----------------------------------------------------
async function populateAssigneeSelect() {
    try {
        // Exemplo: Buscar colaboradores de uma coleção 'colaboradores' no Firestore
        // Ou, se você usar Firebase Auth, listar usuários (requer Cloud Functions para segurança)
        const collaboratorsCol = collection(db, "colaboradores");
        const querySnapshot = await onSnapshot(collaboratorsCol, (snapshot) => {
            taskAssigneeSelect.innerHTML = '<option value="">Selecione um colaborador</option>';
            filterAssigneeSelect.innerHTML = '<option value="all">Todos</option>';
            snapshot.forEach((doc) => {
                const collaborator = doc.data();
                const option = document.createElement('option');
                option.value = collaborator.email; // Ou collaborator.name, o que preferir
                option.textContent = collaborator.name || collaborator.email;
                taskAssigneeSelect.appendChild(option);

                const filterOption = document.createElement('option');
                filterOption.value = collaborator.email;
                filterOption.textContent = collaborator.name || collaborator.email;
                filterAssigneeSelect.appendChild(filterOption);
            });
        });
    } catch (e) {
        console.error("Erro ao carregar colaboradores: ", e);
    }
}

// Chame a função para popular os colaboradores
populateAssigneeSelect();

// ----------------------------------------------------
// Passo 5: Adicionar Nova Tarefa
// ----------------------------------------------------
// Handler para adicionar tarefa (atualizado)
const addTaskHandler = async (e) => {
    e.preventDefault();

    const description = document.getElementById('task-description').value;
    const type = document.getElementById('task-type').value;
    // NOVO: Obter o valor do campo Processo SEI
    const seiProcess = taskSeiProcessInput.value;
    const assigneeEmail = taskAssigneeSelect.value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;
    const observations = document.getElementById('task-observations').value;
    const status = document.getElementById('task-status').value;

    try {
        const docRef = await addDoc(collection(db, "tarefas"), {
            description: description,
            type: type,
            seiProcess: seiProcess, // NOVO: Salvar o Processo SEI
            assignee: assigneeEmail,
            deadline: new Date(deadline + 'T23:59:59'),
            priority: priority,
            observations: observations,
            status: status,
            createdAt: new Date(),
        });
        console.log("Documento escrito com ID: ", docRef.id);
        taskForm.reset();
        // ----------------------------------------------------
        // Lógica de Envio de E-mail (Importante!)
        // ----------------------------------------------------
        // Para enviar e-mails de forma segura, você precisará de uma Cloud Function.
        // A Cloud Function seria acionada automaticamente por uma nova tarefa no Firestore
        // (usando um trigger onWrite) ou você pode chamá-la diretamente (Callable Function).
        // A chamada direta seria algo como:
        // const sendEmail = httpsCallable(functions, 'sendTaskAssignmentEmail');
        // sendEmail({ taskId: docRef.id, assigneeEmail: assigneeEmail, description: description });
        // Lembre-se que para funções que fazem requisições externas (como envio de email),
        // seu projeto no Firebase Spark precisaria ser atualizado para o plano Blaze
        // (mesmo que seja no-cost dentro dos limites), pois ele permite chamadas de rede externas.
        // ----------------------------------------------------

      } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
    }
};


// ----------------------------------------------------
// Passo 6: Listar e Atualizar Tarefas em Tempo Real
// ----------------------------------------------------
function listenForTasks() {
    let tasksRef = collection(db, "tarefas");
    let q = query(tasksRef, orderBy("createdAt", "desc")); // Ordena as tarefas

    onSnapshot(q, (snapshot) => {
        tasksTableBody.innerHTML = ''; // Limpa a tabela antes de adicionar as novas tarefas
        snapshot.forEach((doc) => {
            const task = { id: doc.id, ...doc.data() };
            // Atualiza o status para "Pendente" se a data atual for maior que o prazo
            const deadlineDate = task.deadline.toDate(); // Converte Timestamp para Date
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Zera hora para comparar apenas a data

            if (task.status !== "Concluído" && today > deadlineDate) {
                task.status = "Pendente";
                // Opcional: Atualizar o status no Firestore para "Pendente" automaticamente
                // if (doc.data().status !== "Pendente") { // Evita escritas desnecessárias
                //    updateDoc(doc.ref, { status: "Pendente" });
                // }
            }
            renderTask(task);
        });
    }, (error) => {
        console.error("Erro ao ouvir tarefas:", error);
    });
}

// Chama a função para começar a ouvir as tarefas
listenForTasks();


// ----------------------------------------------------
// Passo 7: Renderizar uma Tarefa na Tabela
// ----------------------------------------------------
function renderTask(task) {
    const row = tasksTableBody.insertRow();
    row.setAttribute('data-id', task.id); // Armazena o ID do documento na linha

    // Formatação da data
    const deadlineFormatted = task.deadline ? task.deadline.toDate().toLocaleDateString('pt-BR') : 'N/A';

    // Conteúdo da linha da tabela (ATUALIZADO para incluir Processo SEI e Observações)
    row.innerHTML = `
        <td>${task.description}</td>
        <td>${task.type}</td>
        <td>${task.seiProcess || ''}</td> <!-- Exibe Processo SEI, vazio se não houver -->
        <td>${task.assignee}</td>
        <td>${deadlineFormatted}</td>
        <td>${task.priority}</td>
        <td>${task.observations || ''}</td> <!-- Exibe Observações, vazio se não houver -->
        <td><span class="status status-${task.status.replace(/\s/g, '-')}" data-task-status="${task.status}">${task.status}</span></td>
        <td class="action-buttons">
            <button class="edit-btn" data-id="${task.id}">✏️</button>
            <button class="delete-btn" data-id="${task.id}">🗑️</button>
        </td>
    `;

    // Adiciona event listeners para os botões de editar e excluir
    row.querySelector('.edit-btn').addEventListener('click', (e) => editTask(e.target.dataset.id));
    row.querySelector('.delete-btn').addEventListener('click', (e) => deleteTask(e.target.dataset.id));
}
// ... (código anterior do script.js)

// ----------------------------------------------------
// Passo 8: Editar e Excluir Tarefas (Continuação)
// ----------------------------------------------------
async function editTask(id) {
    console.log("Editar tarefa com ID:", id);
    const taskDocRef = doc(db, "tarefas", id);

    try {
        const taskSnapshot = await getDoc(taskDocRef);
        if (taskSnapshot.exists()) {
            const taskData = taskSnapshot.data();
            // Preencher o formulário com os dados da tarefa para edição
            document.getElementById('task-description').value = taskData.description;
            document.getElementById('task-type').value = taskData.type;
            // NOVO: Preencher o campo Processo SEI
            taskSeiProcessInput.value = taskData.seiProcess || '';
            taskAssigneeSelect.value = taskData.assignee;
            document.getElementById('task-deadline').value = taskData.deadline.toDate().toISOString().split('T')[0];
            document.getElementById('task-priority').value = taskData.priority;
            document.getElementById('task-observations').value = taskData.observations;
            document.getElementById('task-status').value = taskData.status;

            const submitButton = taskForm.querySelector('button[type="submit"]');
            submitButton.textContent = "Atualizar Tarefa";
            submitButton.dataset.taskId = id;

            taskForm.removeEventListener('submit', addTaskHandler);
            taskForm.addEventListener('submit', updateTaskHandler);

            document.getElementById('cadastro-tarefa').scrollIntoView({ behavior: 'smooth' });

        } else {
            console.log("Tarefa não encontrada para edição!");
        }
    } catch (e) {
        console.error("Erro ao carregar tarefa para edição:", e);
    }
}

// Handler para atualizar tarefa (atualizado)
const updateTaskHandler = async (e) => {
    e.preventDefault();
    const taskId = e.target.querySelector('button[type="submit"]').dataset.taskId;
    const taskDocRef = doc(db, "tarefas", taskId);

    const description = document.getElementById('task-description').value;
    const type = document.getElementById('task-type').value;
    // NOVO: Obter o valor do campo Processo SEI para atualização
    const seiProcess = taskSeiProcessInput.value;
    const assigneeEmail = taskAssigneeSelect.value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;
    const observations = document.getElementById('task-observations').value;
    const status = document.getElementById('task-status').value;

    try {
        await updateDoc(taskDocRef, {
            description: description,
            type: type,
            seiProcess: seiProcess, // NOVO: Salvar o Processo SEI atualizado
            assignee: assigneeEmail,
            deadline: new Date(deadline + 'T23:59:59'),
            priority: priority,
            observations: observations,
            status: status,
        });
        console.log("Tarefa atualizada com sucesso!");
        taskForm.reset();
        const submitButton = taskForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Salvar Tarefa";
        delete submitButton.dataset.taskId;

        taskForm.removeEventListener('submit', updateTaskHandler);
        taskForm.addEventListener('submit', addTaskHandler);

    } catch (e) {
        console.error("Erro ao atualizar tarefa:", e);
    }
};

// Adiciona o listener inicial do formulário para adicionar tarefas
taskForm.addEventListener('submit', addTaskHandler);

async function deleteTask(id) {
    console.log("Excluir tarefa com ID:", id);
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
        try {
            await deleteDoc(doc(db, "tarefas", id));
            console.log("Tarefa excluída com sucesso!");
        } catch (e) {
            console.error("Erro ao excluir tarefa:", e);
        }
    }
}


// ----------------------------------------------------
// Passo 9: Implementar Filtros
// ----------------------------------------------------
// Passo 9: Implementar Filtros (Atualizado para intervalo de tempo)
// ----------------------------------------------------
filterStatusSelect.addEventListener('change', applyFilters);
filterAssigneeSelect.addEventListener('change', applyFilters);
// Adiciona event listeners para os novos filtros de data
filterStartDateInput.addEventListener('change', applyFilters);
filterEndDateInput.addEventListener('change', applyFilters);


function applyFilters() {
    const selectedStatus = filterStatusSelect.value;
    const selectedAssignee = filterAssigneeSelect.value;
    // Obtém os valores das datas de início e fim
    const startDateValue = filterStartDateInput.value;
    const endDateValue = filterEndDateInput.value;

    let tasksRef = collection(db, "tarefas");
    // Começa a query com ordenação, que será compatível com os filtros que vamos adicionar
    let q = query(tasksRef, orderBy("createdAt", "desc"));

    // Aplicar filtro de status
    if (selectedStatus !== "all") {
        q = query(q, where("status", "==", selectedStatus));
    }

    // Aplicar filtro de colaborador
    if (selectedAssignee !== "all") {
        q = query(q, where("assignee", "==", selectedAssignee));
    }

    // Aplicar filtro por intervalo de tempo (no campo 'deadline')
    if (startDateValue) {
        // Data de início (00:00:00 do dia selecionado)
        const startDate = new Date(startDateValue + 'T00:00:00');
        q = query(q, where("deadline", ">=", startDate));
    }
    if (endDateValue) {
        // Data de fim (23:59:59 do dia selecionado)
        const endDate = new Date(endDateValue + 'T23:59:59');
        q = query(q, where("deadline", "<=", endDate));
    }

    // Re-escuta as tarefas com os novos filtros
    // O 'onSnapshot' vai desinscrever o listener anterior e criar um novo
    onSnapshot(q, (snapshot) => {
        tasksTableBody.innerHTML = ''; // Limpa a tabela
        snapshot.forEach((doc) => {
            const task = { id: doc.id, ...doc.data() };
            const deadlineDate = task.deadline ? task.deadline.toDate() : null; // Lida com possível deadline nulo
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Atualiza o status para "Pendente" se a data atual for maior que o prazo
            if (deadlineDate && task.status !== "Concluído" && today > deadlineDate) {
                task.status = "Pendente";
                // Opcional: Atualizar o status no Firestore para "Pendente" automaticamente
                // if (doc.data().status !== "Pendente") {
                //    updateDoc(doc.ref, { status: "Pendente" });
                // }
            }
            renderTask(task);
        });
    }, (error) => {
        console.error("Erro ao aplicar filtros:", error);
    });
}

// Inicializa os filtros ao carregar a página
applyFilters();

// ----------------------------------------------------
// Passo 10: Painel de Resumo (Exemplo Básico)
// ----------------------------------------------------
// Para o painel de resumo, você pode adicionar mais queries ao Firestore
// para contar tarefas por status, tipo ou colaborador.
// Ex:
/*
async function updateSummaryPanel() {
    const tarefasSnapshot = await getDocs(collection(db, "tarefas"));
    let statusCounts = {
        "Não Iniciado": 0,
        "Em Andamento": 0,
        "Pendente": 0,
        "Concluído": 0
    };
    let typeCounts = {};
    let assigneeCounts = {};

    tarefasSnapshot.forEach(doc => {
        const task = doc.data();
        statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
        typeCounts[task.type] = (typeCounts[task.type] || 0) + 1;
        assigneeCounts[task.assignee] = (assigneeCounts[task.assignee] || 0) + 1;
    });

    const summaryPanel = document.getElementById('painel-resumo');
    summaryPanel.innerHTML = `
        <h2>Painel de Resumo</h2>
        <h3>Por Status:</h3>
        <ul>
            ${Object.entries(statusCounts).map(([status, count]) => `<li>${status}: ${count}</li>`).join('')}
        </ul>
        <h3>Por Tipo:</h3>
        <ul>
            ${Object.entries(typeCounts).map(([type, count]) => `<li>${type}: ${count}</li>`).join('')}
        </ul>
        <h3>Por Colaborador:</h3>
        <ul>
            ${Object.entries(assigneeCounts).map(([assignee, count]) => `<li>${assignee}: ${count}</li>`).join('')}
        </ul>
    `;
}

// Chame updateSummaryPanel() após carregar as tarefas ou quando necessário
// Por exemplo, no final de listenForTasks() ou quando uma tarefa é adicionada/atualizada/excluída.
*/

// ----------------------------------------------------
// Considerações Finais sobre o JavaScript e Firebase
// ----------------------------------------------------
// 1. Configuração do Firebase: Lembre-se de colocar seus dados reais em `firebaseConfig`.
// 2. Import Maps: Para usar as importações com URLs (`https://www.gstatic.com/firebasejs/...`),
//    você pode precisar adicionar um `type="module"` na tag script no HTML (`<script type="module" src="script.js"></script>`)
//    e/ou configurar import maps no seu HTML para um ambiente de produção para gerenciar as dependências de forma mais robusta.
//    Para desenvolvimento local com servidores simples, `type="module"` geralmente funciona.
// 3. Autenticação: O sistema de autenticação (usuários) precisa ser desenvolvido.
//    O exemplo de `populateAssigneeSelect` assume uma coleção de "colaboradores" no Firestore.
//    Para uma gestão completa de usuários com senhas e e-mails, o Firebase Authentication é o ideal.
// 4. Cloud Functions: Para o envio de e-mails, como mencionado, é essencial usar o Cloud Functions.
//    Você precisaria criar uma função que escuta por novas tarefas ou alterações e envia o e-mail.
//    Isso requer a inicialização do Firebase Admin SDK na Cloud Function, e provavelmente o uso de um serviço de e-mail (como SendGrid, Mailgun, etc.).
// 5. Regras de Segurança: **CRÍTICO!** As regras de segurança do seu Firestore precisam ser configuradas para
//    garantir que apenas usuários autenticados (ou com permissões específicas) possam ler, escrever, atualizar e excluir dados.
//    Por padrão, seu banco de dados pode estar aberto para todos. **NÃO DEIXE SEU BANCO DE DADOS ABERTO EM PRODUÇÃO.**
//    Você configuraria isso na aba "Firestore Database" > "Regras" no Console do Firebase.




