 
class QRGenerator {
    constructor() {
        this.form = document.getElementById('qrForm');
        this.toggleBtn = document.getElementById('toggleLogo');
        this.logoSection = document.getElementById('logoSection');
        this.generateBtn = document.getElementById('generateBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.loading = document.getElementById('loading');
        this.result = document.getElementById('result');
        this.qrPreview = document.getElementById('qrPreview');
        this.logoSizeSlider = document.getElementById('logoSize');
        this.logoSizeValue = document.getElementById('logoSizeValue');
        
        this.currentBlob = null;
        this.currentFilename = null;
        
        this.initializeEventListeners();
        this.updateLogoSizeDisplay();
    }

    initializeEventListeners() {
        // Toggle logo section
        this.toggleBtn.addEventListener('click', () => {
            this.toggleLogoSection();
        });

        // Logo size slider
        this.logoSizeSlider.addEventListener('input', (e) => {
            this.updateLogoSizeDisplay();
        });

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateQR();
        });

        // Download button
        this.downloadBtn.addEventListener('click', () => {
            this.downloadQR();
        });

        // Format change
        document.getElementById('format').addEventListener('change', (e) => {
            this.handleFormatChange(e.target.value);
        });
    }

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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error generando QR');
            }

            // Obtener blob y filename
            this.currentBlob = await response.blob();
            this.currentFilename = this.getFilenameFromResponse(response);

            // Mostrar preview
            await this.showPreview();

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    getFilenameFromResponse(response) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const matches = contentDisposition.match(/filename="(.+)"/);
            if (matches) return matches[1];
        }
        
        // Fallback filename
        const format = document.getElementById('format').value;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
        return `qr_${timestamp}.${format}`;
    }

    // async showPreview() {
    //     const format = document.getElementById('format').value;
    //     const url = URL.createObjectURL(this.currentBlob);

    //     // Limpiar preview anterior
    //     this.qrPreview.innerHTML = '';

    //     if (format === 'svg') {
    //         // Para SVG, mostrar como objeto
    //         const svgText = await this.currentBlob.text();
    //         this.qrPreview.innerHTML = svgText;
    //     } else {
    //         // Para imágenes raster, mostrar como img
    //         const img = document.createElement('img');
    //         img.src = url;
    //         img.alt = 'Código QR generado';
    //         img.style.maxWidth = '100%';
    //         img.style.height = 'auto';
    //         this.qrPreview.appendChild(img);
    //     }

    //     // Mostrar resultado y botón de descarga
    //     this.showResult();
    //     this.showDownloadButton();
    // }
    async showPreview() {
    try {
        const format = document.getElementById('format').value;
        console.log(`📸 Mostrando preview - Formato: ${format}, Blob size: ${this.currentBlob.size}`);

        // Limpiar preview anterior
        this.qrPreview.innerHTML = '';

        if (format === 'svg') {
            // Para SVG, leer como texto y insertar
            const svgText = await this.currentBlob.text();
            console.log('📄 SVG content preview:', svgText.substring(0, 100) + '...');
            this.qrPreview.innerHTML = svgText;
        } else {
            // Para imágenes raster, crear URL y mostrar como img
            const url = URL.createObjectURL(this.currentBlob);
            console.log('🖼️ Image URL created:', url);
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Código QR generado';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.border = '1px solid #ddd';
            
            // Agregar evento de carga para debugging
            img.onload = () => {
                console.log('✅ Imagen cargada correctamente');
            };
            
            img.onerror = () => {
                console.error('❌ Error cargando imagen');
            };
            
            this.qrPreview.appendChild(img);
        }

        // Mostrar resultado y botón de descarga
        this.showResult();
        this.showDownloadButton();
        
        console.log('✅ Preview mostrado correctamente');
        
    } catch (error) {
        console.error('❌ Error en showPreview:', error);
        this.qrPreview.innerHTML = '<p style="color: red;">Error mostrando preview</p>';
    }
}

    downloadQR() {
        if (!this.currentBlob) {
            alert('No hay QR para descargar');
            return;
        }

        // Crear enlace de descarga
        const url = URL.createObjectURL(this.currentBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.currentFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

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
    }

    showDownloadButton() {
        this.downloadBtn.classList.remove('hidden');
    }

    // Validaciones
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

        // Validar logo si está habilitado
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
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new QRGenerator();
    console.log('🎉 QR Generator Web Interface loaded!');
});

// Funciones adicionales de utilidad
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Preview del logo seleccionado
document.addEventListener('DOMContentLoaded', () => {
    const logoInput = document.getElementById('logo');
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Mostrar información del archivo
                const info = `📁 ${file.name} (${formatFileSize(file.size)})`;
                
                // Crear o actualizar elemento de información
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