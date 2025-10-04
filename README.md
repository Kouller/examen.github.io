
# Examen 42 preguntas – Multi‑file

Archivos:
- `index.html` – estructura y UI
- `style.css` – estilos
- `bank.js` – **TU banco** (`const TODAS = [...]`) ya incrustado
- `app.js` – lógica del examen (timer, navegación, grabación, nota)

## Vista previa local
```bash
python -m http.server 5500
```
URL: http://localhost:5500/

## GitHub Pages
Sube todos estos archivos al repo (raíz). Activa Pages (branch `main`, folder `/ (root)`).  
URL: `https://TU_USUARIO.github.io/NOMBRE_REPO/`

## XAMPP (opcional)
Copia la carpeta en: `C:\xampp\htdocs\examen`  
Arranca Apache en XAMPP y abre: `http://localhost/examen/`

## Ajustes
- Duración: cambia `DEFAULT_DURATION_MS` en `app.js`
- Pruebas rápidas: añade `?mins=5` a la URL
