 class QRManager {
    constructor() {
         // Referencias del DOM - Generator
        this.form = document.getElementById('qrForm');
        this.toggleBtn = document.getElementById('toggleLogo');
        this.logoSection = document.getElementById('logoSection');
        this.generateBtn = document.getElementById('generateBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.generateNewBtn = document.getElementById('generateNewBtn');
        this.loading = document.getElementById('loading');
        this.result = document.getElementById('result');
        this.qrPreview = document.getElementById('qrPreview');
        this.logoSizeSlider = document.getElementById('logoSize');
        this.logoSizeValue = document.getElementById('logoSizeValue');
        
        // Referencias del DOM - Tabs
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Referencias del DOM - History
        this.historyContainer = document.getElementById('historyContainer');
        this.historyLoading = document.getElementById('historyLoading');
        this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.formatFilter = document.getElementById('formatFilter');
        this.searchHistory = document.getElementById('searchHistory');
        this.historyPagination = document.getElementById('historyPagination');
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        this.pageInfo = document.getElementById('pageInfo');
        this.emptyHistory = document.getElementById('emptyHistory');
        
        // Referencias del DOM - Analytics
        this.analyticsLoading = document.getElementById('analyticsLoading');
        this.statsContainer = document.getElementById('statsContainer');
        this.emptyStats = document.getElementById('emptyStats');
        
        // Estado de la aplicación
        this.currentQR = null;
        this.historyData = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.filteredHistory = [];
        
        this.initializeEventListeners();
        this.updateLogoSizeDisplay();
        this.initializeTabs();
    }

    initializeEventListeners() {
        // Generator events
        this.toggleBtn.addEventListener('click', () => {
            this.toggleLogoSection();
        });

        this.logoSizeSlider.addEventListener('input', () => {
            this.updateLogoSizeDisplay();
        });

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateQR();
        });

        this.downloadBtn.addEventListener('click', () => {
            this.downloadQR();
        });

        this.generateNewBtn.addEventListener('click', () => {
            this.resetGenerator();
        });

        document.getElementById('format').addEventListener('change', (e) => {
            this.handleFormatChange(e.target.value);
        });

        // Tab events
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // History events
        this.refreshHistoryBtn.addEventListener('click', () => {
            this.loadHistory();
        });

        this.clearHistoryBtn.addEventListener('click', () => {
            this.confirmClearHistory();
        });

        this.formatFilter.addEventListener('change', () => {
            this.filterHistory();
        });

        this.searchHistory.addEventListener('input', () => {
            this.filterHistory();
        });

        this.prevPageBtn.addEventListener('click', () => {
            this.changePage(-1);
        });

        this.nextPageBtn.addEventListener('click', () => {
            this.changePage(1);
        });
    }

     initializeTabs() {
        // Mostrar tab inicial
        this.switchTab('generator');
    }

    switchTab(tabName) {
        // Actualizar botones de navegación
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Actualizar contenido
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Cargar datos según la pestaña
        if (tabName === 'history') {
            this.loadHistory();
        } else if (tabName === 'analytics') {
            this.loadAnalytics();
        }
    }

    // ======================
    // GENERATOR METHODS
    // ======================
    toggleLogoSection() {
        const isHidden = this.logoSection.classList.contains('hidden');
        
        if (isHidden) {
            this.logoSection.classList.remove('hidden');
            this.logoSection.classList.add('active');
            this.toggleBtn.textContent = '❌ Quitar Logo';
            this.toggleBtn.style.background = '#dc3545';
            this.toggleBtn.style.color = 'white';
        } else {
            this.logoSection.classList.add('hidden');
            this.logoSection.classList.remove('active');
            this.toggleBtn.textContent = '📁 Agregar Logo (Opcional)';
            this.toggleBtn.style.background = '#f8f9fa';
            this.toggleBtn.style.color = '#495057';
            
            // Limpiar logo seleccionado
            document.getElementById('logo').value = '';
        }
    }

    updateLogoSizeDisplay() {
        const value = this.logoSizeSlider.value;
        const percentage = Math.round(value * 100);
        this.logoSizeValue.textContent = `${percentage}%`;
    }

    handleFormatChange(format) {
        // Mostrar/ocultar campo de calidad para JPG
        const qualityGroup = document.getElementById('qualityGroup');
        if (format === 'jpg' || format === 'jpeg') {
            if (!qualityGroup) {
                this.createQualityField();
            }
        } else {
            if (qualityGroup) {
                qualityGroup.remove();
            }
        }
    }

    createQualityField() {
        const formatGroup = document.getElementById('format').closest('.form-group');
        const qualityHTML = `
            <div class="form-group" id="qualityGroup">
                <label for="quality">Calidad JPG (%)</label>
                <input type="number" id="quality" name="quality" 
                       value="90" min="1" max="100">
            </div>
        `;
        formatGroup.insertAdjacentHTML('afterend', qualityHTML);
    }

    async generateQR() {
        try {
            this.showLoading();
            this.hideResult();

             if (!this.validateForm()) {
                this.hideLoading();
                return;
            }

            // Preparar datos del formulario
            const formData = new FormData();
            
            // Campos básicos
            formData.append('text', document.getElementById('text').value);
            formData.append('size', document.getElementById('size').value);
            formData.append('format', document.getElementById('format').value);

            // Campo de calidad si existe
            const qualityField = document.getElementById('quality');
            if (qualityField) {
                formData.append('quality', qualityField.value);
            }

            // Campos del logo si la sección está visible
            if (!this.logoSection.classList.contains('hidden')) {
                const logoFile = document.getElementById('logo').files[0];
                if (logoFile) {
                    formData.append('logo', logoFile);
                }
                
                formData.append('logoSize', document.getElementById('logoSize').value);
                formData.append('logoPaddingWidth', document.getElementById('logoPaddingWidth').value);
                formData.append('logoPaddingHeight', document.getElementById('logoPaddingHeight').value);
            }

            // Realizar petición a la API
            const response = await fetch('/api/qr/generate', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error generando QR');
            }

            console.log('QR generado:', data);
            this.currentQR = data.data.qr;
            await this.showPreview();

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

/*     async showPreview() {
        try {
        if (!this.currentQR) return;
        console.log('Mostrando preview del QR:', this.currentQR.url);
        this.qrPreview.innerHTML = '';
        if (this.currentQR.format === 'svg') {
            // Para SVG, hacer fetch del contenido y mostrarlo
            const response = await fetch(this.currentQR.url);
            const svgContent = await response.text();
            this.qrPreview.innerHTML = svgContent;
        } else {
            // Para imágenes raster, crear elemento img
            const img = document.createElement('img');
            img.src = this.currentQR.url;
            img.alt = 'Código QR generado';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.border = '1px solid #ddd';
            
            img.onload = () => {
                console.log('Imagen cargada correctamente');
            };
            
            img.onerror = () => {
                console.error('Error cargando imagen');
                this.qrPreview.innerHTML = '<p style="color: red;">Error cargando imagen</p>';
            };
            
            this.qrPreview.appendChild(img);
        }
        this.showResult();
        this.showDownloadButton();
        
    } catch (error) {
        console.error('Error en showPreview:', error);
        this.qrPreview.innerHTML = '<p style="color: red;">Error mostrando preview</p>';
    }
} */

/*     async showPreview() {
    try {
        if (!this.currentQR) return;

        console.log('Mostrando preview del QR via proxy:', this.currentQR.id); // Cambiado

        this.qrPreview.innerHTML = '';

        if (this.currentQR.format === 'svg') {
            // Para SVG, usar proxy del servidor
            const proxyUrl = `/api/qr/preview/${this.currentQR.id}`;
            const response = await fetch(proxyUrl);
            const svgContent = await response.text();
            this.qrPreview.innerHTML = svgContent;
        } else {
            // Para imágenes raster, usar proxy del servidor
            const img = document.createElement('img');
            img.src = `/api/qr/preview/${this.currentQR.id}`; // Esta línea es clave
            img.alt = 'Código QR generado';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.border = '1px solid #ddd';
            
            img.onload = () => {
                console.log('Imagen cargada correctamente via proxy');
            };
            
            img.onerror = () => {
                console.error('Error cargando imagen via proxy');
                this.qrPreview.innerHTML = '<p style="color: red;">Error cargando imagen</p>';
            };
            
            this.qrPreview.appendChild(img);
        }

        this.showResult();
        this.showDownloadButton();
        
    } catch (error) {
        console.error('Error en showPreview:', error);
        this.qrPreview.innerHTML = '<p style="color: red;">Error mostrando preview</p>';
    }
} */

   async showPreview() {
    try {
        if (!this.currentQR) return;

        console.log('Mostrando preview del QR:', this.currentQR.id);

        this.qrPreview.innerHTML = '';

        if (this.currentQR.format === 'svg') {
            // Para SVG, usar proxy del servidor
            const proxyUrl = `/api/qr/preview/${this.currentQR.id}`;
            const response = await fetch(proxyUrl);
            const svgContent = await response.text();
            this.qrPreview.innerHTML = svgContent;
        } else {
            // Para imágenes raster, usar directamente la URL de Cloudinary
            const img = document.createElement('img');
            img.src = this.currentQR.url; // Usar directamente la URL de Cloudinary
            console.log('URL de imagen:', this.currentQR.url); // Para debug
            //img.src = `/api/qr/preview/${this.currentQR.id}`;
            img.alt = 'Código QR generado';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.border = '1px solid #ddd';
            
            img.onload = () => {
                console.log('Imagen cargada correctamente desde Cloudinary');
            };
            
            img.onerror = () => {
                console.error('Error cargando imagen desde Cloudinary');
                this.qrPreview.innerHTML = '<p style="color: red;">Error cargando imagen</p>';
            };
            
            this.qrPreview.appendChild(img);
        }

        this.showResult();
        this.showDownloadButton();
        
    } catch (error) {
        console.error('Error en showPreview:', error);
        this.qrPreview.innerHTML = '<p style="color: red;">Error mostrando preview</p>';
    }
}
    downloadQR() {
        if (!this.currentBlob) {
            alert('No hay QR para descargar');
            return;
        }

        
        // Crear enlace de descarga
        const a = document.createElement('a');
        a.href = this.currentQR.url;
        a.download = `qr-${this.currentQR.id}.${this.currentQR.format}`;
        a.target = '_blank'; // Por si es necesario abrir en nueva ventana
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

     resetGenerator() {
        this.form.reset();
        this.hideResult();
        this.currentQR = null;
        
        // Resetear logo section
        if (!this.logoSection.classList.contains('hidden')) {
            this.toggleLogoSection();
        }
        
        // Resetear valores por defecto
        document.getElementById('size').value = 400;
        document.getElementById('logoSize').value = 0.2;
        document.getElementById('logoPaddingWidth').value = 15;
        document.getElementById('logoPaddingHeight').value = 15;
        this.updateLogoSizeDisplay();
        
        // Remover campo de calidad si existe
        const qualityGroup = document.getElementById('qualityGroup');
        if (qualityGroup) {
            qualityGroup.remove();
        }
    }

    validateForm() {
        const text = document.getElementById('text').value.trim();
        if (!text) {
            alert('Por favor ingresa un texto o URL');
            return false;
        }

        const size = parseInt(document.getElementById('size').value);
        if (size < 100 || size > 1000) {
            alert('El tamaño debe estar entre 100 y 1000 píxeles');
            return false;
        }

        if (!this.logoSection.classList.contains('hidden')) {
            const logoFile = document.getElementById('logo').files[0];
            if (logoFile) {
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (logoFile.size > maxSize) {
                    alert('El logo no debe superar 5MB');
                    return false;
                }

                const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
                if (!allowedTypes.includes(logoFile.type)) {
                    alert('Formato de logo no válido. Use PNG, JPG, WEBP o SVG');
                    return false;
                }
            }
        }

        return true;
    }

     // ======================
    // HISTORY METHODS
    // ======================
     async loadHistory() {
        try {
            this.showHistoryLoading();
            this.hideHistoryElements();

            const response = await fetch('/api/qr/history');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error cargando historial');
            }

            this.historyData = data.data.qrs || [];
            this.filterHistory();

            console.log(`Historial cargado: ${this.historyData.length} QRs`);

        } catch (error) {
            console.error('Error cargando historial:', error);
            this.showEmptyHistory('Error cargando historial');
        } finally {
            this.hideHistoryLoading();
        }
    }

    filterHistory() {
        const formatFilter = this.formatFilter.value;
        const searchTerm = this.searchHistory.value.toLowerCase();

        this.filteredHistory = this.historyData.filter(qr => {
            const matchesFormat = !formatFilter || qr.format === formatFilter;
            const matchesSearch = !searchTerm || 
                (qr.metadata.text && qr.metadata.text.toLowerCase().includes(searchTerm));
            
            return matchesFormat && matchesSearch;
        });

        this.currentPage = 1;
        this.renderHistory();
    }

    renderHistory() {
        if (this.filteredHistory.length === 0) {
            this.showEmptyHistory();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredHistory.slice(startIndex, endIndex);

        this.historyContainer.innerHTML = '';

        pageItems.forEach(qr => {
            const historyItem = this.createHistoryItem(qr);
            this.historyContainer.appendChild(historyItem);
        });

        this.updatePagination();
        this.showHistoryElements();
    }

    createHistoryItem(qr) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const createdDate = new Date(qr.createdAt).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        div.innerHTML = `
            <div class="history-item-header">
                <span class="qr-format-badge">${qr.format.toUpperCase()}</span>
                <span class="qr-date">${createdDate}</span>
            </div>
            
            <div class="qr-text">${qr.metadata.text || 'Sin texto'}</div>
            
            <div class="qr-preview-small">
                <img src="${qr.url}" alt="QR Preview" loading="lazy">
            </div>
            
            <div class="history-item-actions">
                <button class="secondary-btn" onclick="qrManager.downloadHistoryQR('${qr.id}', '${qr.url}', '${qr.format}')">
                    📥 Descargar
                </button>
                <button class="danger-btn" onclick="qrManager.deleteHistoryQR('${qr.id}')">
                    🗑️ Eliminar
                </button>
            </div>
        `;

        return div;
    }

    async downloadHistoryQR(id, url, format) {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = `qr-${id}.${format}`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error descargando QR:', error);
            alert('Error al descargar QR');
        }
    }

    async deleteHistoryQR(qrId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este QR?')) {
            return;
        }

        try {
            const response = await fetch(`/api/qr/${qrId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error eliminando QR');
            }

            console.log(`QR ${qrId} eliminado`);
            
            // Recargar historial
            await this.loadHistory();
            
            // Recargar analytics si está visible
            if (document.getElementById('analytics-tab').classList.contains('active')) {
                this.loadAnalytics();
            }

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    }

    async confirmClearHistory() {
        if (!confirm('¿Estás seguro de que quieres eliminar TODO el historial? Esta acción no se puede deshacer.')) {
            return;
        }

        if (!confirm('Esta acción eliminará permanentemente todos los QRs generados. ¿Continuar?')) {
            return;
        }

        try {
            this.showHistoryLoading();

            const response = await fetch('/api/qr/clear-history', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error limpiando historial');
            }

            console.log('Historial limpiado:', data.message);
            alert(data.message);
            
            // Recargar historial
            await this.loadHistory();
            
            // Recargar analytics si está visible
            if (document.getElementById('analytics-tab').classList.contains('active')) {
                this.loadAnalytics();
            }

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            this.hideHistoryLoading();
        }
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        const newPage = this.currentPage + direction;

        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderHistory();
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === totalPages;
        this.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;

        if (totalPages > 1) {
            this.historyPagination.classList.remove('hidden');
        } else {
            this.historyPagination.classList.add('hidden');
        }
    }

    // ======================
    // ANALYTICS METHODS
    // ======================

    async loadAnalytics() {
        try {
            this.showAnalyticsLoading();
            this.hideAnalyticsElements();

            const response = await fetch('/api/qr/stats');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error cargando estadísticas');
            }

            this.renderAnalytics(data.data);
            console.log('Estadísticas cargadas:', data.data);

        } catch (error) {
            console.error('Error cargando analytics:', error);
            this.showEmptyStats();
        } finally {
            this.hideAnalyticsLoading();
        }
    }

    renderAnalytics(stats) {
        if (!stats || stats.totalQRs === 0) {
            this.showEmptyStats();
            return;
        }

        // Actualizar números principales
        document.getElementById('totalQRs').textContent = stats.totalQRs || 0;
        document.getElementById('withLogo').textContent = stats.withLogo || 0;
        document.getElementById('popularFormat').textContent = stats.mostUsedFormat || '-';
        
        if (stats.lastGenerated) {
            const lastDate = new Date(stats.lastGenerated).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('lastGenerated').textContent = lastDate;
        } else {
            document.getElementById('lastGenerated').textContent = '-';
        }

        // Renderizar gráfico de formatos
        this.renderFormatChart(stats.formatDistribution || {});
        
        // Renderizar actividad reciente
        this.renderActivityChart(stats.recentActivity || {});

        this.showAnalyticsElements();
    }

    renderFormatChart(formatData) {
        const chartContent = document.getElementById('formatChartContent');
        chartContent.innerHTML = '';

        const colors = {
            png: '#667eea',
            jpg: '#f093fb',
            webp: '#4facfe',
            svg: '#43e97b'
        };

        Object.entries(formatData).forEach(([format, count]) => {
            const formatBar = document.createElement('div');
            formatBar.className = 'format-bar';
            formatBar.innerHTML = `
                <div class="format-info">
                    <div class="format-color" style="background-color: ${colors[format] || '#6c757d'}"></div>
                    <span>${format.toUpperCase()}</span>
                </div>
                <span class="format-count">${count}</span>
            `;
            chartContent.appendChild(formatBar);
        });
    }

    renderActivityChart(activityData) {
        const chartContent = document.getElementById('activityChartContent');
        chartContent.innerHTML = '';

        Object.entries(activityData).forEach(([date, count]) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <span class="activity-date">${date}</span>
                <span class="activity-count">${count} QRs</span>
            `;
            chartContent.appendChild(activityItem);
        });
    }

    // ======================
    // UI HELPER METHODS
    // ======================

    // Métodos de UI
    showLoading() {
        this.loading.classList.remove('hidden');
        this.generateBtn.disabled = true;
        this.generateBtn.textContent = '⏳ Generando...';
    }

    hideLoading() {
        this.loading.classList.add('hidden');
        this.generateBtn.disabled = false;
        this.generateBtn.textContent = '🚀 Generar QR';
    }

    showResult() {
        this.result.classList.remove('hidden');
        this.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    hideResult() {
        this.result.classList.add('hidden');
        this.downloadBtn.classList.add('hidden');
        this.generateNewBtn.classList.add('hidden');
    }

    showDownloadButton() {
        this.downloadBtn.classList.remove('hidden');
        this.generateNewBtn.classList.remove('hidden');
    }

    showHistoryLoading() {
        this.historyLoading.classList.remove('hidden');
    }

    hideHistoryLoading() {
        this.historyLoading.classList.add('hidden');
    }

    showHistoryElements() {
        this.historyContainer.classList.remove('hidden');
        this.emptyHistory.classList.add('hidden');
    }

    hideHistoryElements() {
        this.historyContainer.classList.add('hidden');
        this.historyPagination.classList.add('hidden');
    }

    showEmptyHistory(message = null) {
        this.emptyHistory.classList.remove('hidden');
        this.hideHistoryElements();
        
        if (message) {
            this.emptyHistory.querySelector('p').textContent = message;
        } else {
            this.emptyHistory.querySelector('p').textContent = 'Los QRs que generes aparecerán aquí';
        }
    }

    showAnalyticsLoading() {
        this.analyticsLoading.classList.remove('hidden');
    }

    hideAnalyticsLoading() {
        this.analyticsLoading.classList.add('hidden');
    }

    showAnalyticsElements() {
        this.statsContainer.classList.remove('hidden');
        this.emptyStats.classList.add('hidden');
    }

    hideAnalyticsElements() {
        this.statsContainer.classList.add('hidden');
    }

    showEmptyStats() {
        this.emptyStats.classList.remove('hidden');
        this.hideAnalyticsElements();
    }
}

// Funciones utilitarias
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Instancia global
let qrManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    qrManager = new QRManager();
    console.log('🎉 QR Manager loaded with tabs!');

    // Preview del logo seleccionado
    const logoInput = document.getElementById('logo');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const info = `📁 ${file.name} (${formatFileSize(file.size)})`;
                
                let infoElement = document.getElementById('logoInfo');
                if (!infoElement) {
                    infoElement = document.createElement('div');
                    infoElement.id = 'logoInfo';
                    infoElement.style.marginTop = '10px';
                    infoElement.style.padding = '10px';
                    infoElement.style.background = '#e9ecef';
                    infoElement.style.borderRadius = '5px';
                    infoElement.style.fontSize = '14px';
                    logoInput.parentNode.appendChild(infoElement);
                }
                infoElement.textContent = info;
            }
        });
    }
});
