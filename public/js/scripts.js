// public/js/scripts.js (VERSÃO COMPLETA E FINAL)

/**
 * Função para criar e exibir uma notificação "toast" dinamicamente via JavaScript.
 * Usada para mostrar feedback de ações AJAX (como salvar a edição de férias).
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - 'success' (verde) ou 'error' (vermelho).
  * @param {number} duration - Duração em milissegundos.
 */
/**
 * Função para criar e exibir uma notificação "toast" dinamicamente via JavaScript.
 * VERSÃO SEGURA: Previne XSS usando textContent em vez de innerHTML
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - 'success' (verde) ou 'error' (vermelho).
 * @param {number} duration - Duração em milissegundos.
 */
function showToast(message, type = 'success', duration = 5000) {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '1090';

    const toastTypeClass = type === 'success' ? 'toast-success' : 'toast-error';

    // Criar elementos DOM de forma segura (previne XSS)
    const toast = document.createElement('div');
    toast.className = `toast toast-progress ${toastTypeClass} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const dFlex = document.createElement('div');
    dFlex.className = 'd-flex';

    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message; // ✅ Usa textContent (seguro)

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Fechar');

    const progressBar = document.createElement('div');
    progressBar.className = 'toast-progress-bar';
    progressBar.style.animationDuration = `${duration - 200}ms`;

    // Montar a estrutura
    dFlex.appendChild(toastBody);
    dFlex.appendChild(closeButton);
    toast.appendChild(dFlex);
    toast.appendChild(progressBar);
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);

    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: duration
    });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        if (document.body.contains(toastContainer)) {
            document.body.removeChild(toastContainer);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {

    // ===== LÓGICA DE TOASTS CORRIGIDA =====
    const TOAST_DURATION = 5000; // 5 segundos

    const initializeAllToasts = () => {
        document.querySelectorAll('.toast').forEach(toastElement => {
            const toastInstance = bootstrap.Toast.getOrCreateInstance(toastElement, {
                autohide: true,
                delay: TOAST_DURATION
            });
            toastInstance.show();

            const progressBar = toastElement.querySelector('.toast-progress-bar');
            if(progressBar) {
                progressBar.style.animationDuration = `${TOAST_DURATION - 200}ms`;
            }
        });
    };
    initializeAllToasts();
  });



/**
 * Função principal que executa quando o DOM está totalmente carregado.
 */
document.addEventListener('DOMContentLoaded', () => {

    // 1. INICIALIZA COMPONENTES BOOTSTRAP (como Dicas de Ferramentas)
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // 2. CONTROLA O FECHAMENTO AUTOMÁTICO DE "TOASTS" QUE JÁ VÊM NA PÁGINA
    document.querySelectorAll('.toast.show').forEach(toast => {
        setTimeout(() => {
            const toastInstance = bootstrap.Toast.getInstance(toast) || new bootstrap.Toast(toast);
            toastInstance.hide();
        }, 4000);
    });
    
    /**
     * LÓGICA DO FORMULÁRIO DE CADASTRO DE USUÁRIO
     */
    const initUserRegistrationForm = () => {
        const dataIngressoInput = document.getElementById("data_ingresso");
        const anoReferenciaInput = document.getElementById("ano_referencia");
        const paInicioInput = document.getElementById("periodo_aquisitivo_inicio");
        const paFimInput = document.getElementById("periodo_aquisitivo_fim");

        if (!dataIngressoInput || !anoReferenciaInput || !paInicioInput || !paFimInput) return;

        const anoAtual = new Date().getFullYear(); // Ex: 2025

        // Renomeamos as variáveis para clareza, mas os IDs no HTML continuam os mesmos
        const btnEsquerda = document.getElementById("btn-ano-anterior");
        const btnMeio = document.getElementById("btn-ano-atual");
        const btnDireita = document.getElementById("btn-ano-proximo");
        
        // --- INÍCIO DA ALTERAÇÃO ---
        // Atribui os novos valores de texto aos botões
        btnEsquerda.textContent = anoAtual - 2; // Ex: 2023
        btnMeio.textContent = anoAtual - 1;   // Ex: 2024
        btnDireita.textContent = anoAtual;     // Ex: 2025

        // Mantém o ano corrente como o valor padrão e botão ativo
        anoReferenciaInput.value = anoAtual;
        btnDireita.classList.add('active');
        btnEsquerda.classList.remove('active');
        btnMeio.classList.remove('active');
        // --- FIM DA ALTERAÇÃO ---

        const updateActiveButton = (selectedYear) => {
            [btnEsquerda, btnMeio, btnDireita].forEach(btn => {
                if (btn) btn.classList.remove('active');
            });
            if (selectedYear == anoAtual - 2) btnEsquerda.classList.add('active');
            else if (selectedYear == anoAtual - 1) btnMeio.classList.add('active');
            else if (selectedYear == anoAtual) btnDireita.classList.add('active');
        };
        
        const calcularPeriodoAquisitivo = () => {
            const dataIngresso = dataIngressoInput.value;
            const anoBase = parseInt(anoReferenciaInput.value);
            if (!dataIngresso || !anoBase) return;

            const [, month, day] = dataIngresso.split('-');
            const inicio = new Date(anoBase, parseInt(month) - 1, parseInt(day));
            const fim = new Date(inicio);
            fim.setFullYear(fim.getFullYear() + 1);
            fim.setDate(fim.getDate() - 1);

            paInicioInput.value = inicio.toISOString().split('T')[0];
            paFimInput.value = fim.toISOString().split('T')[0];
        };

        [btnEsquerda, btnMeio, btnDireita].forEach(btn => {
            if (btn) {
                btn.addEventListener("click", () => {
                    anoReferenciaInput.value = btn.textContent;
                    updateActiveButton(btn.textContent);
                    calcularPeriodoAquisitivo();
                });
            }
        });

        dataIngressoInput.addEventListener("change", calcularPeriodoAquisitivo);
        
        calcularPeriodoAquisitivo();
    };
    initUserRegistrationForm();


    /**
     * 3. LÓGICA REUTILIZÁVEL PARA FORMULÁRIOS DE FÉRIAS (Criação e Edição)
     * Controla a exibição dos campos de período e o cálculo automático das datas finais.
     * @param {string} containerSelector - O seletor do elemento que contém o formulário (ex: '#editFeriasModal' ou '#adminVacationFormContainer').
     */
    function initVacationFormLogic(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const qtdPeriodosSelect = container.querySelector('#qtd_periodos');
        if (!qtdPeriodosSelect) return;

        const updatePeriodFields = () => {
            const selectedValue = qtdPeriodosSelect.value;
            const numPeriods = parseInt(selectedValue.split('_')[0]);
            for (let i = 1; i <= 3; i++) {
                const periodContainer = container.querySelector(`#periodo${i}_container`);
                if (periodContainer) {
                    const inputInicio = periodContainer.querySelector(`#periodo${i}_inicio`);
                    const inputFim = periodContainer.querySelector(`#periodo${i}_fim`);
                    if (i <= numPeriods) {
                        periodContainer.style.display = 'block';
                        inputInicio.required = true;
                        inputFim.required = true;
                    } else {
                        periodContainer.style.display = 'none';
                        inputInicio.required = false;
                        inputFim.required = false;
                        inputInicio.value = ''; // Limpa os campos ocultos para não enviar dados sujos
                        inputFim.value = '';
                    }
                }
            }
        };

        const autoFillEndDates = () => {
            const [numPeriods, dur1_str, dur2_str] = qtdPeriodosSelect.value.split('_');
            const durations = [parseInt(dur1_str) || 0, parseInt(dur2_str) || 0];
            
            const addDays = (date, days) => {
                const result = new Date(date + 'T00:00:00Z'); // Trata a data como UTC
                result.setUTCDate(result.getUTCDate() + days);
                return result.toISOString().split('T')[0];
            };

            if (numPeriods === '1') {
                const inicio1 = container.querySelector('#periodo1_inicio').value;
                if (inicio1) container.querySelector('#periodo1_fim').value = addDays(inicio1, 29);
            } else if (numPeriods === '2') {
                const inicio1 = container.querySelector('#periodo1_inicio').value;
                if (inicio1) container.querySelector('#periodo1_fim').value = addDays(inicio1, durations[0] - 1);
                
                const inicio2 = container.querySelector('#periodo2_inicio').value;
                if (inicio2) container.querySelector('#periodo2_fim').value = addDays(inicio2, durations[1] - 1);
            } else if (numPeriods === '3') {
                for(let i = 1; i <= 3; i++){
                    const inicio = container.querySelector(`#periodo${i}_inicio`).value;
                    if(inicio) container.querySelector(`#periodo${i}_fim`).value = addDays(inicio, 9);
                }
            }
        };
        
        qtdPeriodosSelect.addEventListener('change', () => {
            updatePeriodFields();
            autoFillEndDates();
        });

        for (let i = 1; i <= 3; i++) {
            const inputInicio = container.querySelector(`#periodo${i}_inicio`);
            if(inputInicio) inputInicio.addEventListener('change', autoFillEndDates);
        }

        updatePeriodFields(); // Chama na inicialização
    }
    
    // Aplica a lógica dinâmica ao formulário de CADASTRO de férias
    initVacationFormLogic('form[action="/vacations/admin-mark"]');

    /**
     * 4. LÓGICA PARA LIDAR COM O ENVIO (SUBMIT) DO FORMULÁRIO DE EDIÇÃO DE FÉRIAS
     * Esta função é chamada depois que o formulário é carregado dinamicamente no modal.
     */
    function attachEditVacationFormHandler() {
        const editForm = document.querySelector('#editFeriasModal form');
        if (!editForm) return;

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o recarregamento da página
            const formData = new FormData(editForm);
            const url = editForm.action;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(formData)
                });
                
                const result = await response.json();

                showToast(result.message, response.ok ? 'success' : 'error');
                
                if (response.ok) {
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('editFeriasModal'));
                    modalInstance.hide();
                    setTimeout(() => window.location.reload(), 2000); // Recarrega a página após 2s
                }
            } catch (err) {
                console.error('Erro de comunicação:', err);
                showToast('Erro de comunicação com o servidor. Verifique o console.', 'error');
            }
        });
    }

    // 5. LÓGICA PARA CARREGAR O CONTEÚDO DOS MODAIS DINÂMICOS
    const initDynamicModals = () => {
        const modalsToInit = [
            { id: 'editUsuarioModal', url: '/users/edit' },
            { id: 'editFeriasModal', url: '/vacations/edit' }
        ];

        modalsToInit.forEach(modalInfo => {
            const modalElement = document.getElementById(modalInfo.id);
            if (modalElement) {
                modalElement.addEventListener('show.bs.modal', async (event) => {
                    const button = event.relatedTarget;
                    const modalBody = modalElement.querySelector('.modal-body');
                    modalBody.innerHTML = '<p class="text-center text-muted">Carregando...</p>';
                    try {
                        const response = await fetch(`${modalInfo.url}/${button.dataset.matricula}/${button.dataset.ano}`);
                        if (!response.ok) throw new Error(`Falha ao carregar formulário (status: ${response.status})`);
                        
                        modalBody.innerHTML = await response.text();

                        // Se for o modal de férias, ativa a lógica dinâmica e o handler de submit
                        if(modalInfo.id === 'editFeriasModal') {
                            initVacationFormLogic('#editFeriasModal');
                            attachEditVacationFormHandler();
                        }
                    } catch (error) {
                        modalBody.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
                    }
                });
            }
        });
    };
    initDynamicModals();

    // 6. LÓGICA DE FILTROS DO DASHBOARD
    const initDashboardFilters = () => {
        const filterInputs = [
            document.getElementById("filter-nome"),
            document.getElementById("filter-matricula"),
            document.getElementById("filter-ano"),
            document.getElementById("filter-mes")
        ];
        if (!filterInputs[0]) return; // Sai se não estiver na página do dashboard

        const applyFilters = () => {
            const filters = {
                nome: filterInputs[0].value.toLowerCase(),
                matricula: filterInputs[1].value,
                ano: filterInputs[2].value,
                mes: filterInputs[3].value
            };
            document.querySelectorAll('.classification-table tbody tr').forEach(row => {
                const rowData = {
                    nome: row.dataset.nome || '',
                    matricula: row.dataset.matricula || '',
                    ano: row.dataset.ano || '',
                    mes: (row.dataset.mesFerias || '').split(',')
                };
                const show = 
                    (filters.nome === '' || rowData.nome.includes(filters.nome)) &&
                    (filters.matricula === '' || rowData.matricula.includes(filters.matricula)) &&
                    (filters.ano === '' || rowData.ano === filters.ano) &&
                    (filters.mes === '' || rowData.mes.some(m => m === filters.mes));
                row.style.display = show ? '' : 'none';
            });
        };
        filterInputs.forEach(input => { if (input) input.addEventListener('input', applyFilters); });
        applyFilters();
    };
    initDashboardFilters();

    // ===================================================================
    // NOVA SEÇÃO: CORREÇÃO DO CONFLITO ENTRE OFFCANVAS E MODAL
    // ===================================================================
    const handleOffcanvasModalConflict = () => {
        const modalTriggersInOffcanvas = document.querySelectorAll('.offcanvas [data-bs-toggle="modal"]');

        modalTriggersInOffcanvas.forEach(trigger => {
            trigger.addEventListener('click', function (event) {
                // Impede que o Bootstrap abra o modal automaticamente
                event.preventDefault();

                const targetModalId = this.getAttribute('data-bs-target');
                const targetModal = document.querySelector(targetModalId);
                if (!targetModal) return;

                const offcanvasEl = this.closest('.offcanvas');
                const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);

                if (offcanvas && offcanvasEl.classList.contains('show')) {
                    offcanvasEl.addEventListener('hidden.bs.offcanvas', () => {
                        
                        // ===== AQUI ESTÁ A CORREÇÃO =====
                        // Em vez de 'new bootstrap.Modal()', usamos 'getOrCreateInstance()'.
                        // Isso previne a criação de múltiplas instâncias que causam o bug do backdrop.
                        const modal = bootstrap.Modal.getOrCreateInstance(targetModal);
                        modal.show();

                    }, { once: true });

                    offcanvas.hide();
                }
            });
        });
    };
    handleOffcanvasModalConflict(); // Ativa a correção

    // ===================================================================
    // NOVA FUNÇÃO: LÓGICA DO FORMULÁRIO DE CADASTRO DE FÉRIAS (ADMIN)
    // Esta função agora inclui a lógica de clique no usuário.
    // ===================================================================
    const initAdminVacationForm = () => {
        const form = document.querySelector('form[action="/vacations/admin-mark"]');
        if (!form) return;

        // Aplica a lógica de mostrar/ocultar campos de período
        initVacationFormLogic('form[action="/vacations/admin-mark"]');

        // Lógica para o offcanvas de seleção de usuário
        const userSearchInput = document.getElementById('user-search-input');
        const userItems = document.querySelectorAll('.user-item');
        
        // CORREÇÃO: Adiciona o event listener para cada item de usuário na lista
        userItems.forEach(item => {
            item.addEventListener('click', () => {
                // Preenche os campos do formulário com os dados do usuário clicado
                document.getElementById('matricula').value = item.dataset.matricula;
                document.getElementById('ano_referencia').value = item.dataset.ano;
                
                // Fecha o menu lateral
                const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasUsers'));
                offcanvas.hide();
            });
        });

        // Lógica de busca no menu lateral
        if (userSearchInput) {
            userSearchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                userItems.forEach(item => {
                    const name = (item.dataset.nome || '').toLowerCase();
                    const matricula = item.dataset.matricula || '';
                    if (name.includes(searchTerm) || matricula.includes(searchTerm)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    };
    initAdminVacationForm(); // Ativa a lógica do formulário de férias do admin
    // ===================================================================
    // NOVA SEÇÃO: LÓGICA PARA OS BOTÕES DE GERAR PDF
    // ===================================================================
    const initPdfButtons = () => {
        // Se os botões de download não existirem nesta página, não faz nada.
        if (!document.getElementById('download-ipc')) return;

        function getTableData(tableId, simplified = false) {
            const table = document.getElementById(tableId);
            const data = [];
            const headers = [];
            const visibleColumns = simplified ? [1, 2, 13] : Array.from(Array(15).keys()); // Colunas: Nº, Nome, Férias

            // Cabeçalhos
            table.querySelectorAll("thead tr th").forEach((th, index) => {
                if (visibleColumns.includes(index)) {
                    headers.push(th.innerText.trim());
                }
            });
            data.push(headers);

            // Linhas
            table.querySelectorAll("tbody tr").forEach(tr => {
                if (window.getComputedStyle(tr).display !== "none") {
                    const rowData = [];
                    tr.querySelectorAll("td").forEach((td, index) => {
                        if (visibleColumns.includes(index)) {
                            rowData.push(td.innerText.trim());
                        }
                    });
                    data.push(rowData);
                }
            });
            return data;
        }

        function downloadPDF(tableId, title, filename, simplified = false) {
            const tableData = getTableData(tableId, simplified);
            if (tableData.length <= 1) {
                showToast('Nenhum dado visível para gerar o PDF.', 'error');
                return;
            }
            
            const docDefinition = {
                pageSize: simplified ? 'A4' : 'A4',
                pageOrientation: simplified ? 'portrait' : 'landscape',
                content: [{ text: title, style: 'header' }, {
                    table: {
                        headerRows: 1,
                        body: tableData
                    },
                    layout: 'lightHorizontalLines'
                }],
                styles: {
                    header: {
                        fontSize: 16,
                        bold: true,
                        margin: [0, 0, 0, 10]
                    }
                },
                defaultStyle: {
                    fontSize: simplified ? 10 : 8
                }
            };
            pdfMake.createPdf(docDefinition).download(`${filename}.pdf`);
        }

        const tables = ['ipc', 'epc', 'dpc'];
        const titles = { ipc: 'Classificação dos IPCs', epc: 'Classificação dos EPCs', dpc: 'Classificação dos DPCs' };

        tables.forEach(type => {
            document.getElementById(`download-${type}`).addEventListener('click', () => {
                downloadPDF(`${type}Table`, titles[type], `classificacao_${type}`);
            });
            document.getElementById(`download-simplificado-${type}`).addEventListener('click', () => {
                downloadPDF(`${type}Table`, `Classificação Simplificada - ${titles[type]}`, `classificacao_simplificada_${type}`, true);
            });
        });
    };


    // Executa todas as inicializações
    // ... (outras chamadas de função)
    
    // ===== ADIÇÃO DA NOVA CHAMADA DE FUNÇÃO =====
    initPdfButtons();

    // ===================================================================
    // NOVA SEÇÃO: ATIVA A VALIDAÇÃO VISUAL DE FORMULÁRIOS BOOTSTRAP
    // ===================================================================
    const initBootstrapValidation = () => {
        const forms = document.querySelectorAll('.needs-validation');

        Array.from(forms).forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    };
    
    // ... no final do arquivo, chame a nova função ...
    initBootstrapValidation();



    // ===================================================================
    // DEBUG: VERIFICA SE O FORMULÁRIO DE LOGIN ESTÁ SENDO ENVIADO
    // ===================================================================
    const initLoginDebug = () => {
        const loginForm = document.querySelector('form[action="/auth/login"]');
        if (loginForm) {
            loginForm.addEventListener('submit', function() {
                
            });
        }
    };
    initLoginDebug(); // Ativa o debug


// ===================================================================
    // LÓGICA REESCRITA PARA GERAR PDF NATIVO E PESQUISÁVEL DO CALENDÁRIO
    // ===================================================================
    const initCalendarPdfButton = () => {
        const downloadButton = document.getElementById('download-calendar-pdf');
        if (!downloadButton) return;

        if (typeof EJS_DATA === 'undefined') {
            downloadButton.disabled = true;
            downloadButton.title = 'Dados do calendário não encontrados na página.';
            console.error('Dados do calendário (EJS_DATA) não encontrados para gerar o PDF.');
            return;
        }

        downloadButton.addEventListener('click', () => {
            showToast('Gerando PDF, por favor aguarde...', 'success');

            const { calendarData, year, category } = EJS_DATA;
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

            // Função para construir um objeto de mês para o pdfMake
            function buildMonthObject(y, m) {
                const body = [[...dayNames.map(d => ({ text: d, bold: true, alignment: 'center', fillColor: '#eeeeee' }))]];
                const firstDay = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
                const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
                
                let day = 1;
                for (let i = 0; i < 6; i++) {
                    const week = [];
                    for (let j = 0; j < 7; j++) {
                        if ((i === 0 && j < firstDay) || day > daysInMonth) {
                            week.push({ text: '' });
                        } else {
                            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const names = calendarData[dateStr] || [];
                            const cellContent = [{ text: day, bold: true, alignment: 'left' }];
                            names.forEach(name => {
                                cellContent.push({ text: name.split(' ')[0], fontSize: 7, margin: [0, 1, 0, 1] });
                            });
                            week.push({ stack: cellContent, margin: [2, 2, 2, 2] });
                            day++;
                        }
                    }
                    body.push(week);
                    if (day > daysInMonth) break;
                }
                
                // Retorna um "bloco" contendo o título e a tabela do mês
                // A propriedade 'unbreakable: true' impede que a tabela de um mês seja cortada entre duas páginas
                return {
                    stack: [
                        { text: monthNames[m - 1], style: 'monthHeader' },
                        {
                            table: {
                                widths: ['*', '*', '*', '*', '*', '*', '*'],
                                body: body
                            },
                            layout: {
                                hLineWidth: () => 0.5, vLineWidth: () => 0.5,
                                hLineColor: () => '#dddddd', vLineColor: () => '#dddddd',
                            }
                        }
                    ],
                    unbreakable: true, // <-- MÁGICA ACONTECE AQUI
                    margin: [0, 0, 0, 15]
                };
            }

            // Constrói o conteúdo de todos os 12 meses em uma única lista
            const content = [];
            for (let i = 1; i <= 12; i++) {
                content.push(buildMonthObject(year, i));
            }

            const docDefinition = {
                pageSize: 'A4',
                pageOrientation: 'portrait',
                content: [
                    { text: `Calendário de Férias - ${category} - ${year}`, style: 'header' },
                    // O layout de colunas é removido, permitindo o fluxo natural
                    ...content
                ],
                styles: {
                    header: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
                    monthHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 2] }
                },
                defaultStyle: { fontSize: 8 }
            };

            pdfMake.createPdf(docDefinition).download(`calendario_ferias_${year}.pdf`);
        });
    };
    
    initCalendarPdfButton(); //Ativa a nova função



    const initClassificationFilter = () => {
        const filterSelect = document.querySelector('#classification-page #filter-ano');
        if (!filterSelect) return;

        filterSelect.addEventListener('change', function() {
            const selectedYear = this.value;
            if (selectedYear) {
                // Recarrega a página com o novo ano como um parâmetro de URL
                window.location.href = `/classification?year=${selectedYear}`;
            }
        });
    };

    initClassificationFilter();


    // ===================================================================
    // NOVA FUNÇÃO: LÓGICA PARA OS MODAIS DINÂMICOS DE APAGAR E RESETAR
    // ===================================================================
    const initDynamicYearModals = () => {
        const modals = [
            { id: 'deleteUserModal', matriculaInputId: 'delete_matricula', containerId: 'delete-years-container', name: 'anos_referencia' },
            { id: 'resetVacationsModal', matriculaInputId: 'reset_matricula', containerId: 'reset-years-container', name: 'anos_referencia' }
        ];

        modals.forEach(config => {
            const modalEl = document.getElementById(config.id);
            if (!modalEl) return;

            const matriculaInput = modalEl.querySelector(`#${config.matriculaInputId}`);
            const yearsContainer = modalEl.querySelector(`#${config.containerId}`);
            let debounceTimer;

            matriculaInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    const matricula = matriculaInput.value.trim();
                    if (matricula.length < 1) { // Mínimo de 1 dígito para buscar
                        yearsContainer.innerHTML = '<p class="text-muted small">Digite uma matrícula para buscar os anos.</p>';
                        return;
                    }
                    
                    try {
                        const response = await fetch(`/users/years/${matricula}`);
                        const data = await response.json();

                        if (data.success && data.years.length > 0) {
                            yearsContainer.innerHTML = '<label class="form-label">Selecione o(s) ano(s):</label>';
                            data.years.forEach(year => {
                                const div = document.createElement('div');
                                div.className = 'form-check';
                                div.innerHTML = `
                                    <input class="form-check-input" type="checkbox" name="${config.name}" value="${year}" id="${config.id}_year_${year}">
                                    <label class="form-check-label" for="${config.id}_year_${year}">${year}</label>
                                `;
                                yearsContainer.appendChild(div);
                            });
                        } else {
                            yearsContainer.innerHTML = '<p class="text-danger small">Nenhum ano de referência encontrado para esta matrícula.</p>';
                        }
                    } catch (error) {
                        console.error('Erro ao buscar anos:', error);
                        yearsContainer.innerHTML = '<p class="text-danger small">Erro ao buscar dados.</p>';
                    }
                }, 500); // Espera 500ms após o usuário parar de digitar
            });

            // Limpa o container quando o modal for fechado
            modalEl.addEventListener('hidden.bs.modal', () => {
                matriculaInput.value = '';
                yearsContainer.innerHTML = '<p class="text-muted small">Digite uma matrícula para ver os anos de referência disponíveis.</p>';
            });
        });
    };
    
    
    // ATIVA A NOVA FUNCIONALIDADE
    initDynamicYearModals();

});


