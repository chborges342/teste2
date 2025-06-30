// Sistema de Gestão de Horários - Ciências Econômicas UESC
// Arquivo principal JavaScript

// Estrutura de dados global
let appData = {
    professores: [],
    disciplinas: [],
    turmas: [],
    salas: [],
    horarios: []
};

// Configurações dos horários
const HORARIOS_CONFIG = {
    matutino: {
        dias: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
        blocos: [
            { id: 1, inicio: '07:30', fim: '08:20' },
            { id: 2, inicio: '08:20', fim: '09:10' },
            { id: 3, inicio: '09:10', fim: '10:00' },
            { id: 4, inicio: '10:00', fim: '10:50' },
            { id: 5, inicio: '10:50', fim: '11:40' },
            { id: 6, inicio: '11:40', fim: '12:30' }
        ],
        semestres: Array.from({length: 9}, (_, i) => i + 1)
    },
    noturno: {
        dias: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
        blocos: {
            'segunda': [
                { id: 1, inicio: '18:40', fim: '19:30' },
                { id: 2, inicio: '19:30', fim: '20:20' }
            ],
            'terca': [
                { id: 1, inicio: '18:40', fim: '19:30' },
                { id: 2, inicio: '19:30', fim: '20:20' }
            ],
            'quarta': [
                { id: 1, inicio: '18:40', fim: '19:30' },
                { id: 2, inicio: '19:30', fim: '20:20' }
            ],
            'quinta': [
                { id: 1, inicio: '18:40', fim: '19:30' },
                { id: 2, inicio: '19:30', fim: '20:20' }
            ],
            'sexta': [
                { id: 1, inicio: '18:40', fim: '19:30' },
                { id: 2, inicio: '19:30', fim: '20:20' }
            ],
            'sabado': [
                { id: 1, inicio: '07:30', fim: '08:20' },
                { id: 2, inicio: '08:20', fim: '09:10' },
                { id: 3, inicio: '09:10', fim: '10:00' },
                { id: 4, inicio: '10:00', fim: '10:50' },
                { id: 5, inicio: '10:50', fim: '11:40' },
                { id: 6, inicio: '11:40', fim: '12:30' }
            ]
        },
        semestres: Array.from({length: 10}, (_, i) => i + 1)
    }
};

const CODIGOS_TURMA = {
    matutino: {
        regular: ['T02'],
        extra: ['T04', 'T06']
    },
    noturno: {
        regular: ['T01'],
        extra: ['T03', 'T05']
    }
};

// Utilitários
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container');
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' :
                 type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' :
                 'fas fa-info-circle';
    
    alert.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
        <button class="alert-close">&times;</button>
    `;
    
    alertsContainer.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
    
    // Close button
    alert.querySelector('.alert-close').addEventListener('click', () => {
        alert.parentNode.removeChild(alert);
    });
}

function clearForm(formId) {
    const form = document.getElementById(formId);
    form.reset();
    
    // Clear multiple selects
    const multiSelects = form.querySelectorAll('select[multiple]');
    multiSelects.forEach(select => {
        Array.from(select.options).forEach(option => option.selected = false);
    });
    
    // Clear checkboxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
}

// Navegação
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');
            
            // Update dashboard counts when returning to dashboard
            if (targetSection === 'dashboard') {
                updateDashboardCounts();
            }
        });
    });
}

// Tabs nos cadastros
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
}

// Dashboard
function updateDashboardCounts() {
    document.getElementById('professores-count').textContent = appData.professores.length;
    document.getElementById('disciplinas-count').textContent = appData.disciplinas.length;
    document.getElementById('turmas-count').textContent = appData.turmas.length;
    document.getElementById('salas-count').textContent = appData.salas.length;
}

// Professores
function initProfessores() {
    const form = document.getElementById('professor-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('professor-nome').value.trim();
        const email = document.getElementById('professor-email').value.trim();
        const disciplinasSelect = document.getElementById('professor-disciplinas');
        const disciplinas = Array.from(disciplinasSelect.selectedOptions).map(option => option.value);
        
        if (!nome) {
            showAlert('Nome do professor é obrigatório', 'error');
            return;
        }
        
        const professor = {
            id: generateId(),
            nome,
            email,
            disciplinas
        };
        
        appData.professores.push(professor);
        showAlert('Professor cadastrado com sucesso!', 'success');
        clearForm('professor-form');
        renderProfessoresList();
        updateSelectOptions();
        saveData();
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-professores');
    searchInput.addEventListener('input', () => {
        renderProfessoresList(searchInput.value);
    });
}

function renderProfessoresList(searchTerm = '') {
    const container = document.getElementById('professores-list');
    const filteredProfessores = appData.professores.filter(professor =>
        professor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        professor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredProfessores.length === 0) {
        container.innerHTML = '<p class="no-activity">Nenhum professor encontrado</p>';
        return;
    }
    
    container.innerHTML = filteredProfessores.map(professor => {
        const disciplinasNomes = professor.disciplinas.map(id => {
            const disciplina = appData.disciplinas.find(d => d.id === id);
            return disciplina ? disciplina.nome : 'Disciplina não encontrada';
        }).join(', ');
        
        return `
            <div class="item-card">
                <div class="item-info">
                    <h4>${professor.nome}</h4>
                    <p>Email: ${professor.email || 'Não informado'}</p>
                    <p>Disciplinas: ${disciplinasNomes || 'Nenhuma'}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger btn-small" onclick="deleteProfessor('${professor.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteProfessor(id) {
    if (confirm('Tem certeza que deseja excluir este professor?')) {
        appData.professores = appData.professores.filter(p => p.id !== id);
        renderProfessoresList();
        updateSelectOptions();
        showAlert('Professor excluído com sucesso!', 'success');
        saveData();
    }
}

// Disciplinas
function initDisciplinas() {
    const form = document.getElementById('disciplina-form');
    const turnoSelect = document.getElementById('disciplina-turno');
    const semestreSelect = document.getElementById('disciplina-semestre');
    
    // Update semestre options when turno changes
    turnoSelect.addEventListener('change', () => {
        const turno = turnoSelect.value;
        semestreSelect.innerHTML = '<option value="">Selecione o semestre</option>';
        
        if (turno) {
            const semestres = HORARIOS_CONFIG[turno].semestres;
            semestres.forEach(sem => {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = `${sem}º Semestre`;
                semestreSelect.appendChild(option);
            });
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('disciplina-nome').value.trim();
        const codigo = document.getElementById('disciplina-codigo').value.trim();
        const cargaHoraria = parseInt(document.getElementById('disciplina-carga').value);
        const turno = document.getElementById('disciplina-turno').value;
        const semestre = parseInt(document.getElementById('disciplina-semestre').value);
        
        if (!nome || !codigo || !cargaHoraria || !turno || !semestre) {
            showAlert('Todos os campos são obrigatórios', 'error');
            return;
        }
        
        // Check if codigo already exists
        if (appData.disciplinas.some(d => d.codigo === codigo)) {
            showAlert('Código da disciplina já existe', 'error');
            return;
        }
        
        const disciplina = {
            id: generateId(),
            nome,
            codigo,
            cargaHoraria,
            turno,
            semestre
        };
        
        appData.disciplinas.push(disciplina);
        showAlert('Disciplina cadastrada com sucesso!', 'success');
        clearForm('disciplina-form');
        renderDisciplinasList();
        updateSelectOptions();
        saveData();
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-disciplinas');
    searchInput.addEventListener('input', () => {
        renderDisciplinasList(searchInput.value);
    });
}

function renderDisciplinasList(searchTerm = '') {
    const container = document.getElementById('disciplinas-list');
    const filteredDisciplinas = appData.disciplinas.filter(disciplina =>
        disciplina.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disciplina.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredDisciplinas.length === 0) {
        container.innerHTML = '<p class="no-activity">Nenhuma disciplina encontrada</p>';
        return;
    }
    
    container.innerHTML = filteredDisciplinas.map(disciplina => `
        <div class="item-card">
            <div class="item-info">
                <h4>${disciplina.nome}</h4>
                <p>Código: ${disciplina.codigo}</p>
                <p>Carga Horária: ${disciplina.cargaHoraria}h/aula</p>
                <p>Turno: ${disciplina.turno} - ${disciplina.semestre}º Semestre</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-small" onclick="deleteDisciplina('${disciplina.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function deleteDisciplina(id) {
    if (confirm('Tem certeza que deseja excluir esta disciplina?')) {
        appData.disciplinas = appData.disciplinas.filter(d => d.id !== id);
        renderDisciplinasList();
        updateSelectOptions();
        showAlert('Disciplina excluída com sucesso!', 'success');
        saveData();
    }
}

// Turmas
function initTurmas() {
    const form = document.getElementById('turma-form');
    const turnoSelect = document.getElementById('turma-turno');
    const semestreSelect = document.getElementById('turma-semestre');
    const tipoSelect = document.getElementById('turma-tipo');
    const codigoSelect = document.getElementById('turma-codigo');
    
    // Update semestre options when turno changes
    turnoSelect.addEventListener('change', () => {
        const turno = turnoSelect.value;
        semestreSelect.innerHTML = '<option value="">Selecione o semestre</option>';
        
        if (turno) {
            const semestres = HORARIOS_CONFIG[turno].semestres;
            semestres.forEach(sem => {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = `${sem}º Semestre`;
                semestreSelect.appendChild(option);
            });
        }
        
        updateCodigoOptions();
    });
    
    // Update codigo options when turno or tipo changes
    tipoSelect.addEventListener('change', updateCodigoOptions);
    
    function updateCodigoOptions() {
        const turno = turnoSelect.value;
        const tipo = tipoSelect.value;
        codigoSelect.innerHTML = '<option value="">Selecione o código</option>';
        
        if (turno && tipo) {
            const codigos = CODIGOS_TURMA[turno][tipo];
            codigos.forEach(codigo => {
                const option = document.createElement('option');
                option.value = codigo;
                option.textContent = codigo;
                codigoSelect.appendChild(option);
            });
        }
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const turno = document.getElementById('turma-turno').value;
        const semestre = parseInt(document.getElementById('turma-semestre').value);
        const tipo = document.getElementById('turma-tipo').value;
        const codigo = document.getElementById('turma-codigo').value;
        
        if (!turno || !semestre || !tipo || !codigo) {
            showAlert('Todos os campos são obrigatórios', 'error');
            return;
        }
        
        // Check if turma already exists
        if (appData.turmas.some(t => t.turno === turno && t.semestreCurricular === semestre && t.codigo === codigo)) {
            showAlert('Turma já existe com estes parâmetros', 'error');
            return;
        }
        
        const nome = `${semestre}º Semestre ${turno.charAt(0).toUpperCase() + turno.slice(1)} - ${codigo}`;
        
        const turma = {
            id: generateId(),
            nome,
            turno,
            semestreCurricular: semestre,
            tipo,
            codigo
        };
        
        appData.turmas.push(turma);
        showAlert('Turma cadastrada com sucesso!', 'success');
        clearForm('turma-form');
        renderTurmasList();
        updateSelectOptions();
        saveData();
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-turmas');
    searchInput.addEventListener('input', () => {
        renderTurmasList(searchInput.value);
    });
}

function renderTurmasList(searchTerm = '') {
    const container = document.getElementById('turmas-list');
    const filteredTurmas = appData.turmas.filter(turma =>
        turma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        turma.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredTurmas.length === 0) {
        container.innerHTML = '<p class="no-activity">Nenhuma turma encontrada</p>';
        return;
    }
    
    container.innerHTML = filteredTurmas.map(turma => `
        <div class="item-card">
            <div class="item-info">
                <h4>${turma.nome}</h4>
                <p>Turno: ${turma.turno}</p>
                <p>Tipo: ${turma.tipo} (${turma.codigo})</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-small" onclick="deleteTurma('${turma.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function deleteTurma(id) {
    if (confirm('Tem certeza que deseja excluir esta turma?')) {
        appData.turmas = appData.turmas.filter(t => t.id !== id);
        renderTurmasList();
        updateSelectOptions();
        showAlert('Turma excluída com sucesso!', 'success');
        saveData();
    }
}

// Salas
function initSalas() {
    const form = document.getElementById('sala-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('sala-nome').value.trim();
        const capacidade = parseInt(document.getElementById('sala-capacidade').value) || 0;
        const recursosCheckboxes = form.querySelectorAll('input[type="checkbox"]:checked');
        const recursos = Array.from(recursosCheckboxes).map(cb => cb.value);
        
        if (!nome) {
            showAlert('Nome da sala é obrigatório', 'error');
            return;
        }
        
        // Check if sala already exists
        if (appData.salas.some(s => s.nome === nome)) {
            showAlert('Sala já existe com este nome', 'error');
            return;
        }
        
        const sala = {
            id: generateId(),
            nome,
            capacidade,
            recursos
        };
        
        appData.salas.push(sala);
        showAlert('Sala cadastrada com sucesso!', 'success');
        clearForm('sala-form');
        renderSalasList();
        updateSelectOptions();
        saveData();
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-salas');
    searchInput.addEventListener('input', () => {
        renderSalasList(searchInput.value);
    });
}

function renderSalasList(searchTerm = '') {
    const container = document.getElementById('salas-list');
    const filteredSalas = appData.salas.filter(sala =>
        sala.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredSalas.length === 0) {
        container.innerHTML = '<p class="no-activity">Nenhuma sala encontrada</p>';
        return;
    }
    
    container.innerHTML = filteredSalas.map(sala => `
        <div class="item-card">
            <div class="item-info">
                <h4>${sala.nome}</h4>
                <p>Capacidade: ${sala.capacidade || 'Não informada'}</p>
                <p>Recursos: ${sala.recursos.length > 0 ? sala.recursos.join(', ') : 'Nenhum'}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-small" onclick="deleteSala('${sala.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function deleteSala(id) {
    if (confirm('Tem certeza que deseja excluir esta sala?')) {
        appData.salas = appData.salas.filter(s => s.id !== id);
        renderSalasList();
        updateSelectOptions();
        showAlert('Sala excluída com sucesso!', 'success');
        saveData();
    }
}

// Update select options across the app
function updateSelectOptions() {
    // Update professor disciplinas select
    const professorDisciplinasSelect = document.getElementById('professor-disciplinas');
    professorDisciplinasSelect.innerHTML = '';
    appData.disciplinas.forEach(disciplina => {
        const option = document.createElement('option');
        option.value = disciplina.id;
        option.textContent = `${disciplina.nome} (${disciplina.codigo})`;
        professorDisciplinasSelect.appendChild(option);
    });
    
    // Update horario selects
    updateHorarioSelects();
    
    // Update print selects
    updatePrintSelects();
}

function updateHorarioSelects() {
    const turmaSelect = document.getElementById('horario-turma');
    turmaSelect.innerHTML = '<option value="">Selecione uma turma</option>';
    appData.turmas.forEach(turma => {
        const option = document.createElement('option');
        option.value = turma.id;
        option.textContent = turma.nome;
        turmaSelect.appendChild(option);
    });
}

function updatePrintSelects() {
    // Update print turma select
    const printTurmaSelect = document.getElementById('print-turma');
    printTurmaSelect.innerHTML = '<option value="">Selecione uma turma</option>';
    appData.turmas.forEach(turma => {
        const option = document.createElement('option');
        option.value = turma.id;
        option.textContent = turma.nome;
        printTurmaSelect.appendChild(option);
    });
    
    // Update print professor select
    const printProfessorSelect = document.getElementById('print-professor');
    printProfessorSelect.innerHTML = '<option value="">Selecione um professor</option>';
    appData.professores.forEach(professor => {
        const option = document.createElement('option');
        option.value = professor.id;
        option.textContent = professor.nome;
        printProfessorSelect.appendChild(option);
    });
}

// Data persistence
function saveData() {
    try {
        localStorage.setItem('gestao-horarios-data', JSON.stringify(appData));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        showAlert('Erro ao salvar dados', 'error');
    }
}

function loadData() {
    try {
        const savedData = localStorage.getItem('gestao-horarios-data');
        if (savedData) {
            appData = JSON.parse(savedData);
            
            // Render all lists
            renderProfessoresList();
            renderDisciplinasList();
            renderTurmasList();
            renderSalasList();
            
            // Update selects
            updateSelectOptions();
            
            // Update dashboard
            updateDashboardCounts();
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showAlert('Erro ao carregar dados salvos', 'error');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTabs();
    initProfessores();
    initDisciplinas();
    initTurmas();
    initSalas();
    initHorarios();
    initImpressao();
    
    // Load saved data
    loadData();
    
    console.log('Sistema de Gestão de Horários inicializado com sucesso!');
});


// Horários - Funcionalidades avançadas
function initHorarios() {
    const turmaSelect = document.getElementById('horario-turma');
    const novoHorarioBtn = document.getElementById('btn-novo-horario');
    const limparHorariosBtn = document.getElementById('btn-limpar-horarios');
    const modal = document.getElementById('horario-modal');
    const modalForm = document.getElementById('horario-form');
    
    let currentSlot = null; // Slot atual sendo editado
    
    // Event listeners
    turmaSelect.addEventListener('change', () => {
        if (turmaSelect.value) {
            renderHorariosGrid(turmaSelect.value);
        } else {
            document.getElementById('horarios-grid').innerHTML = '<p class="no-activity">Selecione uma turma para visualizar os horários</p>';
        }
    });
    
    novoHorarioBtn.addEventListener('click', () => {
        if (!turmaSelect.value) {
            showAlert('Selecione uma turma primeiro', 'warning');
            return;
        }
        openHorarioModal();
    });
    
    limparHorariosBtn.addEventListener('click', () => {
        if (!turmaSelect.value) {
            showAlert('Selecione uma turma primeiro', 'warning');
            return;
        }
        
        if (confirm('Tem certeza que deseja limpar todos os horários desta turma?')) {
            appData.horarios = appData.horarios.filter(h => h.idTurma !== turmaSelect.value);
            renderHorariosGrid(turmaSelect.value);
            showAlert('Horários limpos com sucesso!', 'success');
            saveData();
        }
    });
    
    // Modal events
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
            closeHorarioModal();
        }
    });
    
    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveHorario();
    });
}

function renderHorariosGrid(turmaId) {
    const turma = appData.turmas.find(t => t.id === turmaId);
    if (!turma) return;
    
    const container = document.getElementById('horarios-grid');
    const config = HORARIOS_CONFIG[turma.turno];
    
    let html = '<table class="grade-horarios">';
    
    // Header
    html += '<thead><tr><th>Horário</th>';
    
    if (turma.turno === 'matutino') {
        config.dias.forEach(dia => {
            html += `<th>${formatDiaName(dia)}</th>`;
        });
    } else {
        // Noturno - diferentes horários para cada dia
        config.dias.forEach(dia => {
            html += `<th>${formatDiaName(dia)}</th>`;
        });
    }
    
    html += '</tr></thead><tbody>';
    
    // Body
    if (turma.turno === 'matutino') {
        config.blocos.forEach(bloco => {
            html += `<tr><td class="horario-label">${bloco.inicio} - ${bloco.fim}</td>`;
            
            config.dias.forEach(dia => {
                const horario = getHorarioSlot(turmaId, dia, bloco.id);
                html += `<td class="horario-slot ${horario ? 'ocupado' : ''}" 
                            data-dia="${dia}" 
                            data-bloco="${bloco.id}" 
                            onclick="editHorarioSlot('${turmaId}', '${dia}', ${bloco.id})">`;
                
                if (horario) {
                    const disciplina = appData.disciplinas.find(d => d.id === horario.idDisciplina);
                    const professor = appData.professores.find(p => p.id === horario.idProfessor);
                    const sala = appData.salas.find(s => s.id === horario.idSala);
                    
                    html += `<div class="horario-info">
                                <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                                <div class="professor">${professor?.nome || 'N/A'}</div>
                                <div class="sala">${sala?.nome || 'N/A'}</div>
                             </div>`;
                } else {
                    html += '<div class="horario-vazio">+</div>';
                }
                
                html += '</td>';
            });
            
            html += '</tr>';
        });
    } else {
        // Noturno - lógica mais complexa
        const maxBlocos = Math.max(...config.dias.map(dia => config.blocos[dia].length));
        
        for (let i = 0; i < maxBlocos; i++) {
            html += '<tr>';
            
            // Primeira coluna com horários variados
            const horarios = config.dias.map(dia => {
                const bloco = config.blocos[dia][i];
                return bloco ? `${bloco.inicio} - ${bloco.fim}` : '';
            }).filter(h => h);
            
            const horarioUnico = [...new Set(horarios)];
            html += `<td class="horario-label">${horarioUnico.join(' / ')}</td>`;
            
            config.dias.forEach(dia => {
                const bloco = config.blocos[dia][i];
                if (bloco) {
                    const horario = getHorarioSlot(turmaId, dia, bloco.id);
                    html += `<td class="horario-slot ${horario ? 'ocupado' : ''}" 
                                data-dia="${dia}" 
                                data-bloco="${bloco.id}" 
                                onclick="editHorarioSlot('${turmaId}', '${dia}', ${bloco.id})">`;
                    
                    if (horario) {
                        const disciplina = appData.disciplinas.find(d => d.id === horario.idDisciplina);
                        const professor = appData.professores.find(p => p.id === horario.idProfessor);
                        const sala = appData.salas.find(s => s.id === horario.idSala);
                        
                        html += `<div class="horario-info">
                                    <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                                    <div class="professor">${professor?.nome || 'N/A'}</div>
                                    <div class="sala">${sala?.nome || 'N/A'}</div>
                                 </div>`;
                    } else {
                        html += '<div class="horario-vazio">+</div>';
                    }
                    
                    html += '</td>';
                } else {
                    html += '<td class="horario-slot disabled"></td>';
                }
            });
            
            html += '</tr>';
        }
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function formatDiaName(dia) {
    const nomes = {
        'segunda': 'Segunda',
        'terca': 'Terça',
        'quarta': 'Quarta',
        'quinta': 'Quinta',
        'sexta': 'Sexta',
        'sabado': 'Sábado'
    };
    return nomes[dia] || dia;
}

function getHorarioSlot(turmaId, dia, bloco) {
    return appData.horarios.find(h => 
        h.idTurma === turmaId && 
        h.diaSemana === dia && 
        h.bloco === bloco
    );
}

function editHorarioSlot(turmaId, dia, bloco) {
    const turma = appData.turmas.find(t => t.id === turmaId);
    if (!turma) return;
    
    currentSlot = { turmaId, dia, bloco };
    
    // Populate modal with current data if exists
    const existingHorario = getHorarioSlot(turmaId, dia, bloco);
    
    if (existingHorario) {
        document.getElementById('modal-disciplina').value = existingHorario.idDisciplina;
        document.getElementById('modal-professor').value = existingHorario.idProfessor;
        document.getElementById('modal-sala').value = existingHorario.idSala;
    } else {
        document.getElementById('horario-form').reset();
    }
    
    // Update modal selects
    updateModalSelects(turma);
    
    openHorarioModal();
}

function openHorarioModal() {
    const modal = document.getElementById('horario-modal');
    modal.classList.add('active');
}

function closeHorarioModal() {
    const modal = document.getElementById('horario-modal');
    modal.classList.remove('active');
    currentSlot = null;
}

function updateModalSelects(turma) {
    // Update disciplinas select - only for the turma's semester and turno
    const disciplinaSelect = document.getElementById('modal-disciplina');
    disciplinaSelect.innerHTML = '<option value="">Selecione a disciplina</option>';
    
    const disciplinasValidas = appData.disciplinas.filter(d => 
        d.turno === turma.turno && d.semestre === turma.semestreCurricular
    );
    
    disciplinasValidas.forEach(disciplina => {
        const option = document.createElement('option');
        option.value = disciplina.id;
        option.textContent = `${disciplina.nome} (${disciplina.codigo})`;
        disciplinaSelect.appendChild(option);
    });
    
    // Update professores select - only those who can teach the selected disciplina
    const professorSelect = document.getElementById('modal-professor');
    professorSelect.innerHTML = '<option value="">Selecione o professor</option>';
    
    disciplinaSelect.addEventListener('change', () => {
        const disciplinaId = disciplinaSelect.value;
        professorSelect.innerHTML = '<option value="">Selecione o professor</option>';
        
        if (disciplinaId) {
            const professoresValidos = appData.professores.filter(p => 
                p.disciplinas.includes(disciplinaId)
            );
            
            professoresValidos.forEach(professor => {
                const option = document.createElement('option');
                option.value = professor.id;
                option.textContent = professor.nome;
                professorSelect.appendChild(option);
            });
        }
    });
    
    // Update salas select
    const salaSelect = document.getElementById('modal-sala');
    salaSelect.innerHTML = '<option value="">Selecione a sala</option>';
    
    appData.salas.forEach(sala => {
        const option = document.createElement('option');
        option.value = sala.id;
        option.textContent = sala.nome;
        salaSelect.appendChild(option);
    });
}

function saveHorario() {
    if (!currentSlot) return;
    
    const disciplinaId = document.getElementById('modal-disciplina').value;
    const professorId = document.getElementById('modal-professor').value;
    const salaId = document.getElementById('modal-sala').value;
    
    if (!disciplinaId || !professorId || !salaId) {
        showAlert('Todos os campos são obrigatórios', 'error');
        return;
    }
    
    // Validações de conflito
    const conflitos = validateHorarioConflicts(currentSlot, professorId, salaId);
    
    if (conflitos.length > 0) {
        showAlert(`Conflitos detectados: ${conflitos.join(', ')}`, 'error');
        return;
    }
    
    // Remove existing horario if editing
    appData.horarios = appData.horarios.filter(h => 
        !(h.idTurma === currentSlot.turmaId && 
          h.diaSemana === currentSlot.dia && 
          h.bloco === currentSlot.bloco)
    );
    
    // Add new horario
    const novoHorario = {
        id: generateId(),
        diaSemana: currentSlot.dia,
        bloco: currentSlot.bloco,
        idTurma: currentSlot.turmaId,
        idDisciplina: disciplinaId,
        idProfessor: professorId,
        idSala: salaId
    };
    
    appData.horarios.push(novoHorario);
    
    // Update display
    renderHorariosGrid(currentSlot.turmaId);
    closeHorarioModal();
    showAlert('Horário salvo com sucesso!', 'success');
    saveData();
}

function validateHorarioConflicts(slot, professorId, salaId) {
    const conflitos = [];
    
    // Check professor conflict
    const professorConflict = appData.horarios.find(h => 
        h.idProfessor === professorId && 
        h.diaSemana === slot.dia && 
        h.bloco === slot.bloco &&
        !(h.idTurma === slot.turmaId && h.diaSemana === slot.dia && h.bloco === slot.bloco)
    );
    
    if (professorConflict) {
        const turmaConflito = appData.turmas.find(t => t.id === professorConflict.idTurma);
        conflitos.push(`Professor já alocado na turma ${turmaConflito?.nome || 'N/A'}`);
    }
    
    // Check sala conflict
    const salaConflict = appData.horarios.find(h => 
        h.idSala === salaId && 
        h.diaSemana === slot.dia && 
        h.bloco === slot.bloco &&
        !(h.idTurma === slot.turmaId && h.diaSemana === slot.dia && h.bloco === slot.bloco)
    );
    
    if (salaConflict) {
        const turmaConflito = appData.turmas.find(t => t.id === salaConflict.idTurma);
        conflitos.push(`Sala já ocupada pela turma ${turmaConflito?.nome || 'N/A'}`);
    }
    
    return conflitos;
}

// Delete horario (right-click or delete button)
function deleteHorario(turmaId, dia, bloco) {
    if (confirm('Tem certeza que deseja excluir este horário?')) {
        appData.horarios = appData.horarios.filter(h => 
            !(h.idTurma === turmaId && h.diaSemana === dia && h.bloco === bloco)
        );
        
        renderHorariosGrid(turmaId);
        showAlert('Horário excluído com sucesso!', 'success');
        saveData();
    }
}

// Add right-click context menu for deleting horarios
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.horario-slot.ocupado')) {
        e.preventDefault();
        
        const slot = e.target.closest('.horario-slot');
        const dia = slot.getAttribute('data-dia');
        const bloco = parseInt(slot.getAttribute('data-bloco'));
        const turmaId = document.getElementById('horario-turma').value;
        
        if (confirm('Deseja excluir este horário?')) {
            deleteHorario(turmaId, dia, bloco);
        }
    }
});


// Impressão - Funcionalidades
function initImpressao() {
    const printTurmaBtn = document.getElementById('btn-print-turma');
    const printProfessorBtn = document.getElementById('btn-print-professor');
    
    printTurmaBtn.addEventListener('click', () => {
        const turmaId = document.getElementById('print-turma').value;
        if (!turmaId) {
            showAlert('Selecione uma turma', 'warning');
            return;
        }
        generateTurmaPrint(turmaId);
    });
    
    printProfessorBtn.addEventListener('click', () => {
        const professorId = document.getElementById('print-professor').value;
        if (!professorId) {
            showAlert('Selecione um professor', 'warning');
            return;
        }
        generateProfessorPrint(professorId);
    });
}

function generateTurmaPrint(turmaId) {
    const turma = appData.turmas.find(t => t.id === turmaId);
    if (!turma) return;
    
    const preview = document.getElementById('print-preview');
    preview.classList.remove('hidden');
    
    const config = HORARIOS_CONFIG[turma.turno];
    const horariosData = appData.horarios.filter(h => h.idTurma === turmaId);
    
    let html = `
        <div class="print-header">
            <h2>Horário de Aulas - ${turma.nome}</h2>
            <p>Curso: Ciências Econômicas - UESC</p>
            <p>Gerado em: ${formatDateTime(new Date())}</p>
        </div>
        
        <table class="grade-horarios print-table">
            <thead>
                <tr>
                    <th>Horário</th>
    `;
    
    if (turma.turno === 'matutino') {
        config.dias.forEach(dia => {
            html += `<th>${formatDiaName(dia)}</th>`;
        });
    } else {
        config.dias.forEach(dia => {
            html += `<th>${formatDiaName(dia)}</th>`;
        });
    }
    
    html += '</tr></thead><tbody>';
    
    if (turma.turno === 'matutino') {
        config.blocos.forEach(bloco => {
            html += `<tr><td class="horario-label">${bloco.inicio} - ${bloco.fim}</td>`;
            
            config.dias.forEach(dia => {
                const horario = horariosData.find(h => h.diaSemana === dia && h.bloco === bloco.id);
                html += '<td class="horario-cell">';
                
                if (horario) {
                    const disciplina = appData.disciplinas.find(d => d.id === horario.idDisciplina);
                    const professor = appData.professores.find(p => p.id === horario.idProfessor);
                    const sala = appData.salas.find(s => s.id === horario.idSala);
                    
                    html += `
                        <div class="print-horario-info">
                            <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                            <div class="professor">${professor?.nome || 'N/A'}</div>
                            <div class="sala">Sala: ${sala?.nome || 'N/A'}</div>
                        </div>
                    `;
                }
                
                html += '</td>';
            });
            
            html += '</tr>';
        });
    } else {
        // Noturno
        const maxBlocos = Math.max(...config.dias.map(dia => config.blocos[dia].length));
        
        for (let i = 0; i < maxBlocos; i++) {
            html += '<tr>';
            
            const horarios = config.dias.map(dia => {
                const bloco = config.blocos[dia][i];
                return bloco ? `${bloco.inicio} - ${bloco.fim}` : '';
            }).filter(h => h);
            
            const horarioUnico = [...new Set(horarios)];
            html += `<td class="horario-label">${horarioUnico.join(' / ')}</td>`;
            
            config.dias.forEach(dia => {
                const bloco = config.blocos[dia][i];
                html += '<td class="horario-cell">';
                
                if (bloco) {
                    const horario = horariosData.find(h => h.diaSemana === dia && h.bloco === bloco.id);
                    
                    if (horario) {
                        const disciplina = appData.disciplinas.find(d => d.id === horario.idDisciplina);
                        const professor = appData.professores.find(p => p.id === horario.idProfessor);
                        const sala = appData.salas.find(s => s.id === horario.idSala);
                        
                        html += `
                            <div class="print-horario-info">
                                <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                                <div class="professor">${professor?.nome || 'N/A'}</div>
                                <div class="sala">Sala: ${sala?.nome || 'N/A'}</div>
                            </div>
                        `;
                    }
                }
                
                html += '</td>';
            });
            
            html += '</tr>';
        }
    }
    
    html += '</tbody></table>';
    
    html += `
        <div class="print-footer">
            <button class="btn btn-primary" onclick="printPage()">
                <i class="fas fa-print"></i>
                Imprimir
            </button>
            <button class="btn btn-secondary" onclick="closePrintPreview()">
                <i class="fas fa-times"></i>
                Fechar
            </button>
        </div>
    `;
    
    preview.innerHTML = html;
    
    // Scroll to preview
    preview.scrollIntoView({ behavior: 'smooth' });
}

function generateProfessorPrint(professorId) {
    const professor = appData.professores.find(p => p.id === professorId);
    if (!professor) return;
    
    const preview = document.getElementById('print-preview');
    preview.classList.remove('hidden');
    
    const horariosData = appData.horarios.filter(h => h.idProfessor === professorId);
    
    // Group by turno
    const horariosPorTurno = {
        matutino: horariosData.filter(h => {
            const turma = appData.turmas.find(t => t.id === h.idTurma);
            return turma?.turno === 'matutino';
        }),
        noturno: horariosData.filter(h => {
            const turma = appData.turmas.find(t => t.id === h.idTurma);
            return turma?.turno === 'noturno';
        })
    };
    
    let html = `
        <div class="print-header">
            <h2>Horário do Professor - ${professor.nome}</h2>
            <p>Curso: Ciências Econômicas - UESC</p>
            <p>Email: ${professor.email || 'Não informado'}</p>
            <p>Gerado em: ${formatDateTime(new Date())}</p>
        </div>
    `;
    
    // Matutino
    if (horariosPorTurno.matutino.length > 0) {
        html += '<h3>Turno Matutino</h3>';
        html += generateProfessorTurnoTable('matutino', horariosPorTurno.matutino);
    }
    
    // Noturno
    if (horariosPorTurno.noturno.length > 0) {
        html += '<h3>Turno Noturno</h3>';
        html += generateProfessorTurnoTable('noturno', horariosPorTurno.noturno);
    }
    
    if (horariosData.length === 0) {
        html += '<p class="no-activity">Este professor não possui horários cadastrados.</p>';
    }
    
    html += `
        <div class="print-footer">
            <button class="btn btn-primary" onclick="printPage()">
                <i class="fas fa-print"></i>
                Imprimir
            </button>
            <button class="btn btn-secondary" onclick="closePrintPreview()">
                <i class="fas fa-times"></i>
                Fechar
            </button>
        </div>
    `;
    
    preview.innerHTML = html;
    preview.scrollIntoView({ behavior: 'smooth' });
}

function generateProfessorTurnoTable(turno, horariosData) {
    const config = HORARIOS_CONFIG[turno];
    
    let html = `
        <table class="grade-horarios print-table">
            <thead>
                <tr>
                    <th>Horário</th>
    `;
    
    config.dias.forEach(dia => {
        html += `<th>${formatDiaName(dia)}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    if (turno === 'matutino') {
        config.blocos.forEach(bloco => {
            html += `<tr><td class="horario-label">${bloco.inicio} - ${bloco.fim}</td>`;
            
            config.dias.forEach(dia => {
                const horario = horariosData.find(h => h.diaSemana === dia && h.bloco === bloco.id);
                html += '<td class="horario-cell">';
                
                if (horario) {
                    const disciplina = appData.disciplinas.find(d => d.id === horario.idDisciplina);
                    const turma = appData.turmas.find(t => t.id === horario.idTurma);
                    const sala = appData.salas.find(s => s.id === horario.idSala);
                    
                    html += `
                        <div class="print-horario-info">
                            <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                            <div class="turma">${turma?.nome || 'N/A'}</div>
                            <div class="sala">Sala: ${sala?.nome || 'N/A'}</div>
                        </div>
                    `;
                }
                
                html += '</td>';
            });
            
            html += '</tr>';
        });
    } else {
        // Noturno
        const maxBlocos = Math.max(...config.dias.map(dia => config.blocos[dia].length));
        
        for (let i = 0; i < maxBlocos; i++) {
            html += '<tr>';
            
            const horarios = config.dias.map(dia => {
                const bloco = config.blocos[dia][i];
                return bloco ? `${bloco.inicio} - ${bloco.fim}` : '';
            }).filter(h => h);
            
            const horarioUnico = [...new Set(horarios)];
            html += `<td class="horario-label">${horarioUnico.join(' / ')}</td>`;
            
            config.dias.forEach(dia => {
                const bloco = config.blocos[dia][i];
                html += '<td class="horario-cell">';
                
                if (bloco) {
                    const horario = horariosData.find(h => h.diaSemana === dia && h.bloco === bloco.id);
                    
                    if (horario) {
                        const disciplina = appData.disciplinas.find(d => d.id === horario.idDisciplina);
                        const turma = appData.turmas.find(t => t.id === horario.idTurma);
                        const sala = appData.salas.find(s => s.id === horario.idSala);
                        
                        html += `
                            <div class="print-horario-info">
                                <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                                <div class="turma">${turma?.nome || 'N/A'}</div>
                                <div class="sala">Sala: ${sala?.nome || 'N/A'}</div>
                            </div>
                        `;
                    }
                }
                
                html += '</td>';
            });
            
            html += '</tr>';
        }
    }
    
    html += '</tbody></table>';
    return html;
}

function printPage() {
    window.print();
}

function closePrintPreview() {
    const preview = document.getElementById('print-preview');
    preview.classList.add('hidden');
    preview.innerHTML = '';
}

