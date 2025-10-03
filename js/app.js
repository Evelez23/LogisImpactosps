// Variable global para almacenar los datos
let attendanceData = [];
let monthlyChart, vehiclesChart, serviceDistributionChart, averageChart;

// Cargar datos desde el archivo JSON
async function loadAttendanceData() {
    try {
        const response = await fetch('data/asistencias.json');
        const jsonData = await response.json();
        
        // Convertir el formato JSON al formato que espera la aplicación
        attendanceData = [];
        
        jsonData.forEach(dayData => {
            dayData.cultos.forEach(service => {
                const serviceKey = getServiceKey(service.hora);
                const record = {
                    date: dayData.fecha,
                    service: serviceKey,
                    asistentes: service.personas || 0,
                    niños: 0,
                    vehiculos_impacto: service.desglose ? service.desglose.impacto : (service.vehiculos || 0),
                    vehiculos_lf: service.desglose ? service.desglose.little_feet : 0,
                    total_vehiculos: service.vehiculos || 0,
                    ofrenda: 0,
                    notas: service.notas || ''
                };
                attendanceData.push(record);
            });
        });

        // Combinar con datos locales si existen
        const localData = JSON.parse(localStorage.getItem('churchAttendance')) || [];
        localData.forEach(localItem => {
            const exists = attendanceData.some(item => 
                item.date === localItem.date && item.service === localItem.service
            );
            if (!exists) {
                attendanceData.push(localItem);
            }
        });

        // Ordenar por fecha
        attendanceData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Inicializar la aplicación
        initApp();
        
    } catch (error) {
        console.error('Error cargando los datos:', error);
        attendanceData = JSON.parse(localStorage.getItem('churchAttendance')) || [];
        initApp();
    }
}

function getServiceKey(timeString) {
    switch(timeString) {
        case '9:00 AM': return '9am';
        case '11:00 AM': return '11am';
        case '5:00 PM': return '5pm';
        case '7:00 PM': return '7pm';
        case '6:00 AM': return '6am';
        default: return 'especial';
    }
}

function getServiceName(serviceKey) {
    const names = {
        '9am': '9:00 AM',
        '11am': '11:00 AM',
        '5pm': '5:00 PM',
        '7pm': '7:00 PM',
        '6am': '6:00 AM',
        'cena_amor': 'Cena de Amor',
        'especial': 'Servicio Especial'
    };
    return names[serviceKey] || serviceKey;
}

// Inicializar la aplicación (SIMPLIFICADA)
function initApp() {
    initCharts();
    updateQuickStats();
    updateTrendAnalysis();
    updateHistoricalTable();
    updateSundayAnalysis();
    updateTodayServices();
    document.getElementById('date').valueAsDate = new Date();
    
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('es-ES');
    
    // Inicializar backup system después de un pequeño delay
    setTimeout(() => {
        if (typeof initializeBackupSystem === 'function') {
            initializeBackupSystem();
        }
    }, 100);
}

// FUNCIONES DE GRÁFICOS (CON DESTRUCCIÓN SEGURA)
function initCharts() {
    // Destruir gráficos existentes de forma segura
    destroyCharts();
    
    // Procesar datos para gráficos
    const monthlyData = processMonthlyData();
    const serviceData = processServiceData();
    const averageData = processAverageData();

    // Gráfico mensual
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Promedio Mensual de Asistentes',
                    data: monthlyData.averages,
                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                    borderColor: 'rgba(212, 175, 55, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: true, position: 'top' } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Promedio de Asistentes' } }
                }
            }
        });
    }

    // Gráfico de vehículos
    const vehiclesCtx = document.getElementById('vehiclesChart');
    if (vehiclesCtx) {
        vehiclesChart = new Chart(vehiclesCtx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Promedio Vehículos Totales',
                        data: monthlyData.avgVehicles,
                        borderColor: '#d4af37',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Promedio Vehículos Little Feet',
                        data: monthlyData.avgVehiclesLF,
                        borderColor: '#e53e3e',
                        backgroundColor: 'rgba(229, 62, 62, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: { responsive: true }
        });
    }

    // Gráfico de distribución por servicio
    const serviceCtx = document.getElementById('serviceDistributionChart');
    if (serviceCtx) {
        serviceDistributionChart = new Chart(serviceCtx, {
            type: 'doughnut',
            data: {
                labels: ['9:00 AM', '11:00 AM', '5:00 PM', 'Otros'],
                datasets: [{
                    data: [serviceData.total9am, serviceData.total11am, serviceData.total5pm, serviceData.totalOther],
                    backgroundColor: ['#d4af37', '#e53e3e', '#b8941f', '#718096']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // Gráfico de promedios por servicio
    const averageCtx = document.getElementById('averageChart');
    if (averageCtx) {
        averageChart = new Chart(averageCtx, {
            type: 'bar',
            data: {
                labels: ['9:00 AM', '11:00 AM', '5:00 PM'],
                datasets: [{
                    label: 'Promedio de Asistentes por Servicio',
                    data: [averageData.avg9am, averageData.avg11am, averageData.avg5pm],
                    backgroundColor: ['#d4af37', '#e53e3e', '#b8941f']
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

function destroyCharts() {
    // Destruir gráficos de forma segura
    try {
        if (monthlyChart) {
            monthlyChart.destroy();
            monthlyChart = null;
        }
        if (vehiclesChart) {
            vehiclesChart.destroy();
            vehiclesChart = null;
        }
        if (serviceDistributionChart) {
            serviceDistributionChart.destroy();
            serviceDistributionChart = null;
        }
        if (averageChart) {
            averageChart.destroy();
            averageChart = null;
        }
    } catch (error) {
        console.log('Error destruyendo gráficos:', error);
    }
}


function getServiceKey(timeString) {
    switch(timeString) {
        case '9:00 AM': return '9am';
        case '11:00 AM': return '11am';
        case '5:00 PM': return '5pm';
        case '7:00 PM': return '7pm';
        case '6:00 AM': return '6am';
        default: return 'especial';
    }
}

function getServiceName(serviceKey) {
    const names = {
        '9am': '9:00 AM',
        '11am': '11:00 AM',
        '5pm': '5:00 PM',
        '7pm': '7:00 PM',
        '6am': '6:00 AM',
        'cena_amor': 'Cena de Amor',
        'especial': 'Servicio Especial'
    };
    return names[serviceKey] || serviceKey;
}

// Inicializar la aplicación
function initApp() {
    initCharts();
    updateQuickStats();
    updateTrendAnalysis();
    updateHistoricalTable();
    updateSundayAnalysis();
    updateTodayServices();
    initializeBackupSystem();
    document.getElementById('date').valueAsDate = new Date();
    
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('es-ES');
}

// FUNCIONES DE GRÁFICOS
function initCharts() {
    // Procesar datos para gráficos
    const monthlyData = processMonthlyData();
    const serviceData = processServiceData();
    const averageData = processAverageData();

    // Gráfico mensual (PROMEDIOS)
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [
                {
                    label: 'Promedio Mensual de Asistentes',
                    data: monthlyData.averages,
                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                    borderColor: 'rgba(212, 175, 55, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Promedio de Asistentes'
                    }
                }
            }
        }
    });

    // Gráfico de vehículos (PROMEDIOS)
    const vehiclesCtx = document.getElementById('vehiclesChart').getContext('2d');
    vehiclesChart = new Chart(vehiclesCtx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [
                {
                    label: 'Promedio Vehículos Totales',
                    data: monthlyData.avgVehicles,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Promedio Vehículos Little Feet',
                    data: monthlyData.avgVehiclesLF,
                    borderColor: '#e53e3e',
                    backgroundColor: 'rgba(229, 62, 62, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true
        }
    });

    // Gráfico de distribución por servicio
    const serviceCtx = document.getElementById('serviceDistributionChart').getContext('2d');
    serviceDistributionChart = new Chart(serviceCtx, {
        type: 'doughnut',
        data: {
            labels: ['9:00 AM', '11:00 AM', '5:00 PM', 'Otros'],
            datasets: [{
                data: [serviceData.total9am, serviceData.total11am, serviceData.total5pm, serviceData.totalOther],
                backgroundColor: ['#d4af37', '#e53e3e', '#b8941f', '#718096']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    // Gráfico de promedios por servicio
    const averageCtx = document.getElementById('averageChart').getContext('2d');
    averageChart = new Chart(averageCtx, {
        type: 'bar',
        data: {
            labels: ['9:00 AM', '11:00 AM', '5:00 PM'],
            datasets: [{
                label: 'Promedio de Asistentes por Servicio',
                data: [averageData.avg9am, averageData.avg11am, averageData.avg5pm],
                backgroundColor: ['#d4af37', '#e53e3e', '#b8941f']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function processMonthlyData() {
    const months = {};
    
    attendanceData.forEach(item => {
        if (!item.date) return;
        
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        if (!months[monthKey]) {
            months[monthKey] = {
                name: monthName,
                total: 0,
                count: 0,
                vehicles: 0,
                vehiclesLF: 0,
                serviceCount: 0
            };
        }
        
        months[monthKey].total += item.asistentes || 0;
        months[monthKey].count += 1;
        months[monthKey].vehicles += item.total_vehiculos || 0;
        months[monthKey].vehiclesLF += item.vehiculos_lf || 0;
        months[monthKey].serviceCount += 1;
    });
    
    const sortedMonths = Object.keys(months).sort();
    const labels = sortedMonths.map(key => months[key].name);
    const averages = sortedMonths.map(key => Math.round(months[key].total / months[key].serviceCount));
    const avgVehicles = sortedMonths.map(key => Math.round(months[key].vehicles / months[key].serviceCount));
    const avgVehiclesLF = sortedMonths.map(key => Math.round(months[key].vehiclesLF / months[key].serviceCount));
    
    return { labels, averages, avgVehicles, avgVehiclesLF };
}

function processServiceData() {
    let total9am = 0, total11am = 0, total5pm = 0, totalOther = 0;
    
    attendanceData.forEach(item => {
        if (item.service === '9am') total9am += item.asistentes || 0;
        else if (item.service === '11am') total11am += item.asistentes || 0;
        else if (item.service === '5pm') total5pm += item.asistentes || 0;
        else totalOther += item.asistentes || 0;
    });
    
    return { total9am, total11am, total5pm, totalOther };
}

function processAverageData() {
    let sum9am = 0, count9am = 0;
    let sum11am = 0, count11am = 0;
    let sum5pm = 0, count5pm = 0;
    
    attendanceData.forEach(item => {
        if (item.service === '9am' && item.asistentes) {
            sum9am += item.asistentes;
            count9am++;
        } else if (item.service === '11am' && item.asistentes) {
            sum11am += item.asistentes;
            count11am++;
        } else if (item.service === '5pm' && item.asistentes) {
            sum5pm += item.asistentes;
            count5pm++;
        }
    });
    
    return {
        avg9am: count9am ? Math.round(sum9am / count9am) : 0,
        avg11am: count11am ? Math.round(sum11am / count11am) : 0,
        avg5pm: count5pm ? Math.round(sum5pm / count5pm) : 0
    };
}

// FUNCIONES DE ACTUALIZACIÓN DE UI
function updateQuickStats() {
    if (attendanceData.length === 0) return;
    
    const lastActivity = attendanceData[attendanceData.length - 1];
    const lastActivityCount = lastActivity ? lastActivity.asistentes : 0;
    const lastActivityService = lastActivity ? getServiceName(lastActivity.service) : 'N/A';
    
    document.getElementById('lastActivityCount').textContent = lastActivityCount;
    document.getElementById('lastActivityLabel').textContent = `Última actividad: ${lastActivityService}`;
}

function updateTrendAnalysis() {
    if (attendanceData.length < 2) {
        document.getElementById('trendMessage').textContent = 'Se necesitan más datos para el análisis';
        return;
    }
    
    const monthlyData = processMonthlyData();
    const currentMonthAvg = monthlyData.averages[monthlyData.averages.length - 1] || 0;
    const previousMonthAvg = monthlyData.averages[monthlyData.averages.length - 2] || 0;
    
    const trend = currentMonthAvg > previousMonthAvg ? 'aumentando' : 'disminuyendo';
    const difference = Math.abs(currentMonthAvg - previousMonthAvg);
    const percentage = previousMonthAvg > 0 ? 
        ((currentMonthAvg - previousMonthAvg) / previousMonthAvg * 100).toFixed(1) : 0;
    
    document.getElementById('trendMessage').innerHTML = `
        <strong>El promedio mensual está ${trend}</strong><br>
        ${difference} personas ${trend === 'aumentando' ? 'más' : 'menos'} que el mes anterior.
        (${percentage}%)<br>
        ${trend === 'aumentando' ? '🎉 ¡Buen trabajo!' : '💪 ¡Seguimos adelante!'}
    `;
}

// Mostrar servicios del día actual
function updateTodayServices() {
    const today = new Date().toISOString().split('T')[0];
    const todayServices = attendanceData.filter(item => item.date === today);
    
    const grid = document.getElementById('todayServicesGrid');
    grid.innerHTML = '';
    
    if (todayServices.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #718096; grid-column: 1 / -1;">No hay servicios registrados para hoy</p>';
        return;
    }
    
    let totalAsistentes = 0;
    let totalVehiculos = 0;
    
    todayServices.forEach(service => {
        totalAsistentes += service.asistentes || 0;
        totalVehiculos += service.total_vehiculos || 0;
        
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        
        serviceCard.innerHTML = `
            <div class="service-time">${getServiceName(service.service)}</div>
            <div class="service-attendance">${service.asistentes || 0}</div>
            <div class="service-vehicles">Vehículos: ${service.total_vehiculos || 0}</div>
            <div class="service-vehicles">Little Feet: ${service.vehiculos_lf || 0}</div>
        `;
        
        grid.appendChild(serviceCard);
    });
    
    // Agregar total del día
    const totalCard = document.createElement('div');
    totalCard.className = 'today-total';
    totalCard.innerHTML = `
        <div>Total del Día</div>
        <div style="font-size: 1.5em; margin: 10px 0;">${totalAsistentes} Asistentes</div>
        <div>${totalVehiculos} Vehículos</div>
    `;
    
    grid.appendChild(totalCard);
}

// Mostrar análisis del último domingo
function updateSundayAnalysis() {
    const analysisGrid = document.getElementById('sundayAnalysis');
    analysisGrid.innerHTML = '';
    
    // Encontrar el último domingo con datos
    const lastSunday = findLastSundayWithData();
    
    if (!lastSunday) {
        analysisGrid.innerHTML = '<p style="text-align: center; color: #718096; grid-column: 1 / -1;">No hay datos de domingos registrados</p>';
        return;
    }
    
    // Actualizar título y fecha
    document.getElementById('lastSundayTitle').textContent = 'Último Domingo Registrado';
    document.getElementById('lastSundayDate').textContent = formatDate(lastSunday.date);
    
    const services = lastSunday.services;
    const service9am = services['9am'];
    const service11am = services['11am'];
    const service5pm = services['5pm'];
    
    // Calcular total del día (sumar solo los servicios que existen)
    const totalDay = (service9am?.asistentes || 0) + 
                    (service11am?.asistentes || 0) + 
                    (service5pm?.asistentes || 0);
    
    // Crear los 4 cuadros de análisis
    const analysisCards = [
        {
            number: service9am?.asistentes || 'N/D',
            label: 'Servicio 9:00 AM',
            hasData: !!service9am
        },
        {
            number: service11am?.asistentes || 'N/D',
            label: 'Servicio 11:00 AM',
            hasData: !!service11am
        },
        {
            number: service5pm?.asistentes || 'N/D',
            label: 'Reunión 5:00 PM',
            hasData: !!service5pm
        },
        {
            number: totalDay,
            label: 'Total del Domingo',
            isTotal: true
        }
    ];
    
    analysisCards.forEach(card => {
        const statCard = document.createElement('div');
        statCard.className = `stat-card ${!card.hasData && !card.isTotal ? 'no-data' : ''} ${card.isTotal ? 'total-card' : ''}`;
        
        if (card.isTotal) {
            statCard.style.background = 'linear-gradient(135deg, var(--impacto-red) 0%, #c53030 100%)';
            statCard.style.color = 'white';
        }
        
        statCard.innerHTML = `
            <div class="stat-number">${card.number}</div>
            <div class="stat-label">${card.label}</div>
            ${!card.hasData && !card.isTotal ? '<div style="font-size: 0.7em; color: #e53e3e; margin-top: 5px;">No registrado</div>' : ''}
        `;
        
        analysisGrid.appendChild(statCard);
    });
}

function findLastSundayWithData() {
    // Agrupar datos por fecha
    const dataByDate = {};
    attendanceData.forEach(item => {
        if (!dataByDate[item.date]) {
            dataByDate[item.date] = {
                date: item.date,
                services: {}
            };
        }
        dataByDate[item.date].services[item.service] = item;
    });
    
    // Ordenar fechas de más reciente a más antigua
    const sortedDates = Object.keys(dataByDate).sort().reverse();
    
    // Encontrar el último domingo (aunque no tenga los 3 servicios)
    for (const date of sortedDates) {
        const dayData = dataByDate[date];
        const services = dayData.services;
        
        // Verificar si es domingo (usando la lógica corregida de zona horaria)
        const [year, month, day] = date.split('-');
        const dateObj = new Date(year, month - 1, day);
        
        if (dateObj.getDay() === 0) { // 0 = Domingo
            return dayData;
        }
    }
    
    return null;
}

// FUNCIONES DE EXPORTACIÓN
function exportTodayData() {
    const today = new Date().toISOString().split('T')[0];
    const todayServices = attendanceData.filter(item => item.date === today);
    
    if (todayServices.length === 0) {
        alert('No hay datos para exportar del día de hoy.');
        return;
    }
    
    let csv = `Reporte Diario - ${formatDate(today)}\n\n`;
    csv += 'Servicio,Asistentes,Vehículos Total,Vehículos LF,Niños,Notas\n';
    
    let totalAsistentes = 0;
    let totalVehiculos = 0;
    
    todayServices.forEach(service => {
        totalAsistentes += service.asistentes || 0;
        totalVehiculos += service.total_vehiculos || 0;
        
        csv += `"${getServiceName(service.service)}",${service.asistentes || 0},${service.total_vehiculos || 0},${service.vehiculos_lf || 0},${service.niños || 0},"${service.notas || ''}"\n`;
    });
    
    csv += `\nTOTAL,${totalAsistentes},${totalVehiculos}\n`;
    
    downloadCSV(csv, `reporte_diario_${today}.csv`);
    alert(`Reporte del día exportado correctamente!\nTotal: ${totalAsistentes} asistentes, ${totalVehiculos} vehículos`);
}

function exportMonthReport() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const monthData = attendanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
    });
    
    if (monthData.length === 0) {
        alert('No hay datos para exportar del mes actual.');
        return;
    }
    
    let csv = `Reporte Mensual - ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}\n\n`;
    csv += 'Fecha,Día,Servicio,Asistentes,Vehículos Total,Vehículos LF,Niños,Notas\n';
    
    // Agrupar por fecha
    const groupedByDate = {};
    monthData.forEach(item => {
        if (!groupedByDate[item.date]) {
            groupedByDate[item.date] = [];
        }
        groupedByDate[item.date].push(item);
    });
    
    let monthlyTotalAsistentes = 0;
    let monthlyTotalVehiculos = 0;
    
    Object.keys(groupedByDate).sort().forEach(date => {
        const dayTotal = groupedByDate[date].reduce((sum, item) => sum + (item.asistentes || 0), 0);
        const dayVehicles = groupedByDate[date].reduce((sum, item) => sum + (item.total_vehiculos || 0), 0);
        
        monthlyTotalAsistentes += dayTotal;
        monthlyTotalVehiculos += dayVehicles;
        
        groupedByDate[date].forEach(service => {
            csv += `"${formatDate(date)}","${new Date(date).toLocaleDateString('es-ES', { weekday: 'short' })}","${getServiceName(service.service)}",${service.asistentes || 0},${service.total_vehiculos || 0},${service.vehiculos_lf || 0},${service.niños || 0},"${service.notas || ''}"\n`;
        });
        
        // Línea de total del día
        csv += `"","","TOTAL DÍA",${dayTotal},${dayVehicles}\n\n`;
    });
    
    // Totales mensuales
    csv += `\nTOTAL MENSUAL,,,${monthlyTotalAsistentes},${monthlyTotalVehiculos}\n`;
    csv += `PROMEDIO POR SERVICIO,,,${Math.round(monthlyTotalAsistentes / monthData.length)}\n`;
    
    downloadCSV(csv, `reporte_mensual_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`);
    alert(`Reporte mensual exportado correctamente!\nTotal mensual: ${monthlyTotalAsistentes} asistentes`);
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// FUNCIONES UTILITARIAS
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('es-ES', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateHistoricalTable() {
    const tbody = document.getElementById('historicalTableBody');
    tbody.innerHTML = '';
    
    // Agrupar por día
    const groupedByDay = {};
    attendanceData.forEach(item => {
        if (!groupedByDay[item.date]) {
            groupedByDay[item.date] = [];
        }
        groupedByDay[item.date].push(item);
    });
    
    // Ordenar días
    const sortedDays = Object.keys(groupedByDay).sort().reverse();
    
    sortedDays.forEach(day => {
        // Agregar separador de día
        const dayRow = document.createElement('tr');
        dayRow.className = 'day-separator';
        
        const dateObj = new Date(day);
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
        const formattedDate = formatDate(day);
        
        dayRow.innerHTML = `
            <td colspan="6">
                <strong>${formattedDate}</strong> - 
                Total del día: ${groupedByDay[day].reduce((sum, item) => sum + (item.asistentes || 0), 0)} asistentes
            </td>
        `;
        tbody.appendChild(dayRow);
        
        // Agregar servicios de ese día
        groupedByDay[day].forEach(item => {
            const row = document.createElement('tr');
            const serviceNames = {
                '9am': '9:00 AM',
                '11am': '11:00 AM', 
                '5pm': '5:00 PM',
                'cena_amor': 'Cena Amor',
                'especial': 'Especial'
            };
            
            const serviceClass = {
                '9am': 'badge-9am',
                '11am': 'badge-11am',
                '5pm': 'badge-5pm',
                'cena_amor': 'badge-other',
                'especial': 'badge-other'
            };
            
            row.innerHTML = `
                <td>${formatTime(item.date)}</td>
                <td>
                    ${serviceNames[item.service] || item.service}
                    <span class="service-badge ${serviceClass[item.service] || 'badge-other'}">
                        ${serviceNames[item.service] ? serviceNames[item.service].split(' ')[0] : 'Otro'}
                    </span>
                </td>
                <td>${item.asistentes || 0}</td>
                <td>${item.niños || 0}</td>
                <td>${item.total_vehiculos || 0}</td>
                <td>${item.vehiculos_lf || 0}</td>
            `;
            tbody.appendChild(row);
        });
    });
}

function exportToCSV() {
    let csv = 'Fecha,Servicio,Asistentes,Niños,Vehículos Total,Vehículos LF\n';
    
    attendanceData.forEach(item => {
        const serviceNames = {
            '9am': '9:00 AM',
            '11am': '11:00 AM',
            '5pm': '5:00 PM',
            'cena_amor': 'Cena Amor',
            'especial': 'Especial'
        };
        
        csv += `"${formatDate(item.date)}","${serviceNames[item.service] || item.service}",${item.asistentes || 0},${item.niños || 0},${item.total_vehiculos || 0},${item.vehiculos_lf || 0}\n`;
    });
    
    downloadCSV(csv, 'estadisticas_iglesia_impacto.csv');
}

// MANEJO DEL FORMULARIO
document.getElementById('attendanceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newRecord = {
        date: document.getElementById('date').value,
        service: document.getElementById('serviceType').value,
        asistentes: parseInt(document.getElementById('asistentes').value) || 0,
        niños: parseInt(document.getElementById('niños').value) || 0,
        vehiculos_impacto: parseInt(document.getElementById('vehiculos_impacto').value) || 0,
        vehiculos_lf: parseInt(document.getElementById('vehiculos_lf').value) || 0,
        total_vehiculos: parseInt(document.getElementById('vehiculos_impacto').value) + parseInt(document.getElementById('vehiculos_lf').value),
        ofrenda: parseFloat(document.getElementById('ofrenda').value) || 0,
        notas: document.getElementById('notas').value || ''
    };
    
    attendanceData.push(newRecord);
    localStorage.setItem('churchAttendance', JSON.stringify(attendanceData));
    
    // Actualizar gráficos y estadísticas
    updateCharts();
    updateQuickStats();
    updateTrendAnalysis();
    updateHistoricalTable();
    updateSundayAnalysis();
    updateTodayServices();
    
    // Limpiar formulario
    this.reset();
    document.getElementById('date').valueAsDate = new Date();
    alert('¡Datos guardados exitosamente!');
});

function updateCharts() {
    // Destruir gráficos existentes
    if (monthlyChart) monthlyChart.destroy();
    if (vehiclesChart) vehiclesChart.destroy();
    if (serviceDistributionChart) serviceDistributionChart.destroy();
    if (averageChart) averageChart.destroy();
    
    // Recrear gráficos con datos actualizados
    initCharts();
}

// NAVEGACIÓN ENTRE PESTAÑAS
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        // Remover clase active de todas las pestañas
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Agregar clase active a la pestaña clickeada
        this.classList.add('active');
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Inicializar cargando los datos
loadAttendanceData();
