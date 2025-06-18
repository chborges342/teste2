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
        dias: ["segunda", "terca", "quarta", "quinta", "sexta"],
        blocos: [
            { id: 1, inicio: "07:30", fim: "08:20" },
            { id: 2, inicio: "08:20", fim: "09:10" },
            { id: 3, inicio: "09:10", fim: "10:00" },
            { id: 4, inicio: "10:00", fim: "10:50" },
            { id: 5, inicio: "10:50", fim: "11:40" },
            { id: 6, inicio: "11:40", fim: "12:30" }
        ],
        semestres: Array.from({length: 9}, (_, i) => i + 1)
    },
    noturno: {
        dias: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
        blocos: [
            { id: 1, inicio: "18:40", fim: "19:30" },
            { id: 2, inicio: "19:30", fim: "20:20" },
            { id: 3, inicio: "20:20", fim: "21:10" },
            { id: 4, inicio: "21:10", fim: "22:00" },
            // Horários de sábado para o noturno (mesmos do matutino)
            { id: 5, inicio: "07:30", fim: "08:20" },
            { id: 6, inicio: "08:20", fim: "09:10" },
            { id: 7, inicio: "09:10", fim: "10:00" },
            { id: 8, inicio: "10:00", fim: "10:50" },
            { id: 9, inicio: "10:50", fim: "11:40" },
            { id: 10, inicio: "11:40", fim: "12:30" }
        ],
        semestres: Array.from({length: 10}, (_, i) => i + 1)
    }
};

const CODIGOS_TURMA = {
    matutino: {
        regular: ["T02"],
        extra: ["T04", "T06"]
    },
    noturno: {
        regular: ["T01"],
        extra: ["T03", "T05"]
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
        
        // Check if codigo already exists for the same turno
        if (appData.disciplinas.some(d => d.codigo === codigo && d.turno === turno)) {
            showAlert('Código da disciplina já existe para este turno', 'error');
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
                <p>Recursos: ${sala.recursos.join(', ') || 'Nenhum'}</p>
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

// Horários - Funcionalidades
function initHorarios() {
    const form = document.getElementById('horario-form');
    const turnoSelect = document.getElementById('horario-turno');
    const semestreSelect = document.getElementById('horario-semestre');
    const turmaSelect = document.getElementById('horario-turma');
    const disciplinaSelect = document.getElementById('horario-disciplina');
    const professorSelect = document.getElementById('horario-professor');
    const salaSelect = document.getElementById('horario-sala');
    const diaSemanaSelect = document.getElementById('horario-dia-semana');
    const blocoHorarioSelect = document.getElementById('horario-bloco-horario');

    // Update semestre options based on turno
    turnoSelect.addEventListener('change', () => {
        const turno = turnoSelect.value;
        semestreSelect.innerHTML = '<option value="">Selecione o semestre</option>';
        turmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
        disciplinaSelect.innerHTML = '<option value="">Selecione a disciplina</option>';
        professorSelect.innerHTML = '<option value="">Selecione o professor</option>';
        salaSelect.innerHTML = '<option value="">Selecione a sala</option>';
        diaSemanaSelect.innerHTML = '<option value="">Selecione o dia da semana</option>';
        blocoHorarioSelect.innerHTML = '<option value="">Selecione o bloco de horário</option>';

        if (turno) {
            HORARIOS_CONFIG[turno].semestres.forEach(sem => {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = `${sem}º Semestre`;
                semestreSelect.appendChild(option);
            });
            // Populate dias da semana
            HORARIOS_CONFIG[turno].dias.forEach(dia => {
                const option = document.createElement('option');
                option.value = dia;
                option.textContent = dia.charAt(0).toUpperCase() + dia.slice(1);
                diaSemanaSelect.appendChild(option);
            });
        }
        updateTurmaOptions();
        updateDisciplinaOptions();
        updateProfessorOptions();
        updateSalaOptions();
    });

    // Update turma options based on turno and semestre
    semestreSelect.addEventListener('change', updateTurmaOptions);
    function updateTurmaOptions() {
        const turno = turnoSelect.value;
        const semestre = parseInt(semestreSelect.value);
        turmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
        if (turno && semestre) {
            appData.turmas.filter(t => t.turno === turno && t.semestreCurricular === semestre).forEach(turma => {
                const option = document.createElement('option');
                option.value = turma.id;
                option.textContent = turma.nome;
                turmaSelect.appendChild(option);
            });
        }
    }

    // Update disciplina options based on turno and semestre
    semestreSelect.addEventListener('change', updateDisciplinaOptions);
    function updateDisciplinaOptions() {
        const turno = turnoSelect.value;
        const semestre = parseInt(semestreSelect.value);
        disciplinaSelect.innerHTML = '<option value="">Selecione a disciplina</option>';
        if (turno && semestre) {
            appData.disciplinas.filter(d => d.turno === turno && d.semestre === semestre).forEach(disciplina => {
                const option = document.createElement('option');
                option.value = disciplina.id;
                option.textContent = disciplina.nome;
                disciplinaSelect.appendChild(option);
            });
        }
    }

    // Update professor options
    function updateProfessorOptions() {
        professorSelect.innerHTML = '<option value="">Selecione o professor</option>';
        appData.professores.forEach(professor => {
            const option = document.createElement('option');
            option.value = professor.id;
            option.textContent = professor.nome;
            professorSelect.appendChild(option);
        });
    }

    // Update sala options
    function updateSalaOptions() {
        salaSelect.innerHTML = '<option value="">Selecione a sala</option>';
        appData.salas.forEach(sala => {
            const option = document.createElement('option');
            option.value = sala.id;
            option.textContent = sala.nome;
            salaSelect.appendChild(option);
        });
    }

    // Update bloco de horário options based on turno and dia da semana
    diaSemanaSelect.addEventListener('change', () => {
        const turno = turnoSelect.value;
        const diaSemana = diaSemanaSelect.value;
        blocoHorarioSelect.innerHTML = '<option value="">Selecione o bloco de horário</option>';
        if (turno && diaSemana) {
            const blocos = HORARIOS_CONFIG[turno].blocos[diaSemana] || HORARIOS_CONFIG[turno].blocos;
            blocos.forEach(bloco => {
                const option = document.createElement('option');
                option.value = bloco.id;
                option.textContent = `${bloco.inicio} - ${bloco.fim}`;
                blocoHorarioSelect.appendChild(option);
            });
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const turno = turnoSelect.value;
        const semestre = parseInt(semestreSelect.value);
        const turmaId = turmaSelect.value;
        const disciplinaId = disciplinaSelect.value;
        const professorId = professorSelect.value;
        const salaId = salaSelect.value;
        const diaSemana = diaSemanaSelect.value;
        const blocoId = parseInt(blocoHorarioSelect.value);

        if (!turno || !semestre || !turmaId || !disciplinaId || !professorId || !salaId || !diaSemana || !blocoId) {
            showAlert('Todos os campos são obrigatórios', 'error');
            return;
        }

        const blocoHorario = (HORARIOS_CONFIG[turno].blocos[diaSemana] || HORARIOS_CONFIG[turno].blocos).find(b => b.id === blocoId);
        const professor = appData.professores.find(p => p.id === professorId);
        const sala = appData.salas.find(s => s.id === salaId);
        const turma = appData.turmas.find(t => t.id === turmaId);
        const disciplina = appData.disciplinas.find(d => d.id === disciplinaId);

        // Validação de conflitos
        const conflitoProfessor = appData.horarios.some(h =>
            h.professorId === professorId &&
            h.diaSemana === diaSemana &&
            h.blocoId === blocoId
        );

        const conflitoSala = appData.horarios.some(h =>
            h.salaId === salaId &&
            h.diaSemana === diaSemana &&
            h.blocoId === blocoId
        );

        if (conflitoProfessor) {
            showAlert(`Conflito: Professor ${professor.nome} já está alocado neste horário.`, 'error');
            return;
        }

        if (conflitoSala) {
            showAlert(`Conflito: Sala ${sala.nome} já está ocupada neste horário.`, 'error');
            return;
        }

        const horario = {
            id: generateId(),
            turno,
            semestre,
            turmaId,
            disciplinaId,
            professorId,
            salaId,
            diaSemana,
            blocoId,
            blocoInicio: blocoHorario.inicio,
            blocoFim: blocoHorario.fim
        };

        appData.horarios.push(horario);
        showAlert('Horário cadastrado com sucesso!', 'success');
        clearForm('horario-form');
        renderHorariosTable();
        saveData();
    });

    // Search functionality
    const searchInput = document.getElementById('search-horarios');
    searchInput.addEventListener('input', () => {
        renderHorariosTable(searchInput.value);
    });
}

function renderHorariosTable(searchTerm = '') {
    const container = document.getElementById('horarios-table-container');
    let tableHTML = '<table><thead><tr><th>Turno</th><th>Semestre</th><th>Turma</th><th>Disciplina</th><th>Professor</th><th>Sala</th><th>Dia</th><th>Horário</th><th>Ações</th></tr></thead><tbody>';

    const filteredHorarios = appData.horarios.filter(horario => {
        const turma = appData.turmas.find(t => t.id === horario.turmaId);
        const disciplina = appData.disciplinas.find(d => d.id === horario.disciplinaId);
        const professor = appData.professores.find(p => p.id === horario.professorId);
        const sala = appData.salas.find(s => s.id === horario.salaId);

        const searchString = `${horario.turno} ${horario.semestre} ${turma ? turma.nome : ''} ${disciplina ? disciplina.nome : ''} ${professor ? professor.nome : ''} ${sala ? sala.nome : ''} ${horario.diaSemana} ${horario.blocoInicio}-${horario.blocoFim}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    if (filteredHorarios.length === 0) {
        container.innerHTML = '<p class="no-activity">Nenhum horário cadastrado</p>';
        return;
    }

    filteredHorarios.forEach(horario => {
        const turma = appData.turmas.find(t => t.id === horario.turmaId);
        const disciplina = appData.disciplinas.find(d => d.id === horario.disciplinaId);
        const professor = appData.professores.find(p => p.id === horario.professorId);
        const sala = appData.salas.find(s => s.id === horario.salaId);

        tableHTML += `
            <tr>
                <td>${horario.turno}</td>
                <td>${horario.semestre}º</td>
                <td>${turma ? turma.nome : 'N/A'}</td>
                <td>${disciplina ? disciplina.nome : 'N/A'}</td>
                <td>${professor ? professor.nome : 'N/A'}</td>
                <td>${sala ? sala.nome : 'N/A'}</td>
                <td>${horario.diaSemana.charAt(0).toUpperCase() + horario.diaSemana.slice(1)}</td>
                <td>${horario.blocoInicio} - ${horario.blocoFim}</td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteHorario('${horario.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function deleteHorario(id) {
    if (confirm('Tem certeza que deseja excluir este horário?')) {
        appData.horarios = appData.horarios.filter(h => h.id !== id);
        renderHorariosTable();
        showAlert('Horário excluído com sucesso!', 'success');
        saveData();
    }
}

// Impressão - Funcionalidades
function initImpressao() {
    const printSemestreBtn = document.getElementById('print-semestre-btn');
    const printProfessorBtn = document.getElementById('print-professor-btn');
    const printSemestreSelect = document.getElementById('print-semestre-select');
    const printTurnoSelect = document.getElementById('print-turno-select');
    const printProfessorSelect = document.getElementById('print-professor-select');

    // Populate turno and semestre options for printing
    ['matutino', 'noturno'].forEach(turno => {
        const option = document.createElement('option');
        option.value = turno;
        option.textContent = turno.charAt(0).toUpperCase() + turno.slice(1);
        printTurnoSelect.appendChild(option);
    });

    printTurnoSelect.addEventListener('change', () => {
        const turno = printTurnoSelect.value;
        printSemestreSelect.innerHTML = '<option value="">Selecione o semestre</option>';
        if (turno) {
            HORARIOS_CONFIG[turno].semestres.forEach(sem => {
                const option = document.createElement('option');
                option.value = sem;
                option.textContent = `${sem}º Semestre`;
                printSemestreSelect.appendChild(option);
            });
        }
    });

    // Populate professor options for printing
    appData.professores.forEach(professor => {
        const option = document.createElement('option');
        option.value = professor.id;
        option.textContent = professor.nome;
        printProfessorSelect.appendChild(option);
    });

    printSemestreBtn.addEventListener('click', () => {
        const turno = printTurnoSelect.value;
        const semestre = parseInt(printSemestreSelect.value);
        if (!turno || !semestre) {
            showAlert('Selecione o turno e o semestre para imprimir', 'error');
            return;
        }
        printHorariosBySemestre(turno, semestre);
    });

    printProfessorBtn.addEventListener('click', () => {
        const professorId = printProfessorSelect.value;
        if (!professorId) {
            showAlert('Selecione o professor para imprimir', 'error');
            return;
        }
        printHorariosByProfessor(professorId);
    });
}

function printHorariosBySemestre(turno, semestre) {
    const horariosFiltrados = appData.horarios.filter(h => h.turno === turno && h.semestre === semestre);
    if (horariosFiltrados.length === 0) {
        showAlert('Nenhum horário encontrado para este semestre e turno.', 'info');
        return;
    }

    let printContent = `<h1>Quadro de Horários - ${turno.charAt(0).toUpperCase() + turno.slice(1)} - ${semestre}º Semestre</h1>`;
    printContent += '<table><thead><tr><th>Dia</th><th>Horário</th><th>Disciplina</th><th>Professor</th><th>Sala</th><th>Turma</th></tr></thead><tbody>';

    const diasOrdenados = HORARIOS_CONFIG[turno].dias;
    const blocosOrdenados = HORARIOS_CONFIG[turno].blocos;

    diasOrdenados.forEach(dia => {
        blocosOrdenados.forEach(bloco => {
            const horario = horariosFiltrados.find(h => h.diaSemana === dia && h.blocoId === bloco.id);
            if (horario) {
                const disciplina = appData.disciplinas.find(d => d.id === horario.disciplinaId);
                const professor = appData.professores.find(p => p.id === horario.professorId);
                const sala = appData.salas.find(s => s.id === horario.salaId);
                const turma = appData.turmas.find(t => t.id === horario.turmaId);

                printContent += `
                    <tr>
                        <td>${dia.charAt(0).toUpperCase() + dia.slice(1)}</td>
                        <td>${bloco.inicio} - ${bloco.fim}</td>
                        <td>${disciplina ? disciplina.nome : 'N/A'}</td>
                        <td>${professor ? professor.nome : 'N/A'}</td>
                        <td>${sala ? sala.nome : 'N/A'}</td>
                        <td>${turma ? turma.nome : 'N/A'}</td>
                    </tr>
                `;
            }
        });
    });

    printContent += '</tbody></table>';
    printWindow(printContent, `Horarios_${turno}_${semestre}Semestre`);
}

function printHorariosByProfessor(professorId) {
    const horariosFiltrados = appData.horarios.filter(h => h.professorId === professorId);
    const professor = appData.professores.find(p => p.id === professorId);

    if (!professor) {
        showAlert('Professor não encontrado.', 'error');
        return;
    }

    if (horariosFiltrados.length === 0) {
        showAlert(`Nenhum horário encontrado para o professor ${professor.nome}.`, 'info');
        return;
    }

    let printContent = `<h1>Quadro de Horários - Professor: ${professor.nome}</h1>`;
    printContent += '<table><thead><tr><th>Turno</th><th>Semestre</th><th>Dia</th><th>Horário</th><th>Disciplina</th><th>Sala</th><th>Turma</th></tr></thead><tbody>';

    // Sort by turno, then diaSemana, then blocoInicio
    horariosFiltrados.sort((a, b) => {
        const turnoOrder = { 'matutino': 1, 'noturno': 2 };
        const diaOrder = { 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };

        if (turnoOrder[a.turno] !== turnoOrder[b.turno]) {
            return turnoOrder[a.turno] - turnoOrder[b.turno];
        }
        if (diaOrder[a.diaSemana] !== diaOrder[b.diaSemana]) {
            return diaOrder[a.diaSemana] - diaOrder[b.diaSemana];
        }
        // Compare times if they are strings like 'HH:MM'
        const timeA = parseInt(a.blocoInicio.replace(':', ''));
        const timeB = parseInt(b.blocoInicio.replace(':', ''));
        return timeA - timeB;
    });

    horariosFiltrados.forEach(horario => {
        const disciplina = appData.disciplinas.find(d => d.id === horario.disciplinaId);
        const sala = appData.salas.find(s => s.id === horario.salaId);
        const turma = appData.turmas.find(t => t.id === horario.turmaId);

        printContent += `
            <tr>
                <td>${horario.turno.charAt(0).toUpperCase() + horario.turno.slice(1)}</td>
                <td>${horario.semestre}º</td>
                <td>${horario.diaSemana.charAt(0).toUpperCase() + horario.diaSemana.slice(1)}</td>
                <td>${horario.blocoInicio} - ${horario.blocoFim}</td>
                <td>${disciplina ? disciplina.nome : 'N/A'}</td>
                <td>${sala ? sala.nome : 'N/A'}</td>
                <td>${turma ? turma.nome : 'N/A'}</td>
            </tr>
        `;
    });

    printContent += '</tbody></table>';
    printWindow(printContent, `Horarios_Professor_${professor.nome}`);
}

function printWindow(content, title) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <link rel="stylesheet" href="styles.css">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Persistência de dados
function saveData() {
    localStorage.setItem('appDataHorariosUESC', JSON.stringify(appData));
    console.log('Dados salvos:', appData);
}

function loadData() {
    const savedData = localStorage.getItem('appDataHorariosUESC');
    if (savedData) {
        appData = JSON.parse(savedData);
        console.log('Dados carregados:', appData);
    }
}

// Update all select options
function updateSelectOptions() {
    // Disciplinas for professor form
    const professorDisciplinasSelect = document.getElementById('professor-disciplinas');
    professorDisciplinasSelect.innerHTML = '';
    appData.disciplinas.forEach(disciplina => {
        const option = document.createElement('option');
        option.value = disciplina.id;
        option.textContent = disciplina.nome;
        professorDisciplinasSelect.appendChild(option);
    });

    // Professores for horario form
    const horarioProfessorSelect = document.getElementById('horario-professor');
    horarioProfessorSelect.innerHTML = '<option value="">Selecione o professor</option>';
    appData.professores.forEach(professor => {
        const option = document.createElement('option');
        option.value = professor.id;
        option.textContent = professor.nome;
        horarioProfessorSelect.appendChild(option);
    });

    // Salas for horario form
    const horarioSalaSelect = document.getElementById('horario-sala');
    horarioSalaSelect.innerHTML = '<option value="">Selecione a sala</option>';
    appData.salas.forEach(sala => {
        const option = document.createElement('option');
        option.value = sala.id;
        option.textContent = sala.nome;
        horarioSalaSelect.appendChild(option);
    });

    // Turmas for horario form
    const horarioTurmaSelect = document.getElementById('horario-turma');
    horarioTurmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
    appData.turmas.forEach(turma => {
        const option = document.createElement('option');
        option.value = turma.id;
        option.textContent = turma.nome;
        horarioTurmaSelect.appendChild(option);
    });

    // Disciplinas for horario form
    const horarioDisciplinaSelect = document.getElementById('horario-disciplina');
    horarioDisciplinaSelect.innerHTML = '<option value="">Selecione a disciplina</option>';
    appData.disciplinas.forEach(disciplina => {
        const option = document.createElement('option');
        option.value = disciplina.id;
        option.textContent = disciplina.nome;
        horarioDisciplinaSelect.appendChild(option);
    });

    // Professores for print form
    const printProfessorSelect = document.getElementById('print-professor-select');
    printProfessorSelect.innerHTML = '<option value="">Selecione o professor</option>';
    appData.professores.forEach(professor => {
        const option = document.createElement('option');
        option.value = professor.id;
        option.textContent = professor.nome;
        printProfessorSelect.appendChild(option);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initNavigation();
    initTabs();
    updateDashboardCounts();
    initProfessores();
    initDisciplinas();
    initTurmas();
    initSalas();
    initHorarios();
    initImpressao();
    updateSelectOptions(); // Initial population of all selects

    // Set default active section to dashboard
    document.getElementById('dashboard-btn').click();
});


