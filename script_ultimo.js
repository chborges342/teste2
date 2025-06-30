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

            // If navigating to Horários section, ensure options are updated
            if (targetSection === 'horarios') {
                updateSelectOptions(); // Call to populate all selects

                const turnoSelect = document.getElementById('horario-turno');
                const semestreSelect = document.getElementById('horario-semestre');

                // Attach event listeners for dynamic updates
                if (!turnoSelect.dataset.listenerAttached) {
                    turnoSelect.addEventListener('change', () => {
                        const selectedTurno = turnoSelect.value;
                        semestreSelect.innerHTML = '<option value="">Selecione o semestre</option>';
                        if (selectedTurno) {
                            HORARIOS_CONFIG[selectedTurno].semestres.forEach(sem => {
                                const option = document.createElement('option');
                                option.value = sem;
                                option.textContent = `${sem}º Semestre`;
                                semestreSelect.appendChild(option);
                            });
                        }
                        updateTurmaOptions();
                    });
                    turnoSelect.dataset.listenerAttached = 'true';
                }

                if (!semestreSelect.dataset.listenerAttached) {
                    semestreSelect.addEventListener('change', updateTurmaOptions);
                    semestreSelect.dataset.listenerAttached = 'true';
                }

                // Trigger change event to populate semestres and turmas if a turno is already selected
                if (turnoSelect.value) {
                    turnoSelect.dispatchEvent(new Event('change'));
                } else if (turnoSelect.options.length > 1) {
                    turnoSelect.value = turnoSelect.options[1].value;
                    turnoSelect.dispatchEvent(new Event('change'));
                }
            }
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
  
(Content truncated due to size limit. Use line ranges to read in chunks)
