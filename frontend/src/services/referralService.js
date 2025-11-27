/**
 * Servicio para manejar la persistencia del vendedor/referido
 * Guarda en localStorage y cookie para máxima persistencia
 */

const VENDEDOR_KEY = 'wishway_vendedor_id';
const COOKIE_NAME = 'wishway_vendedor';
const COOKIE_DAYS = 30; // Cookie válida por 30 días

class ReferralService {
  /**
   * Guardar vendedor_id en localStorage y cookie
   */
  saveVendedor(vendedorId) {
    if (!vendedorId) return;
    
    console.log(`💾 Guardando vendedor: ${vendedorId}`);
    
    // Guardar en localStorage
    try {
      localStorage.setItem(VENDEDOR_KEY, vendedorId);
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
    
    // Guardar en cookie
    this.setCookie(COOKIE_NAME, vendedorId, COOKIE_DAYS);
  }

  /**
   * Obtener vendedor_id desde localStorage o cookie
   */
  getVendedor() {
    // Intentar desde localStorage primero
    try {
      const vendedorLS = localStorage.getItem(VENDEDOR_KEY);
      if (vendedorLS) {
        console.log(`📖 Vendedor desde localStorage: ${vendedorLS}`);
        return vendedorLS;
      }
    } catch (e) {
      console.error('Error leyendo localStorage:', e);
    }
    
    // Fallback a cookie
    const vendedorCookie = this.getCookie(COOKIE_NAME);
    if (vendedorCookie) {
      console.log(`🍪 Vendedor desde cookie: ${vendedorCookie}`);
      // Sincronizar con localStorage
      try {
        localStorage.setItem(VENDEDOR_KEY, vendedorCookie);
      } catch (e) {}
      return vendedorCookie;
    }
    
    console.log('❌ No hay vendedor guardado');
    return null;
  }

  /**
   * Limpiar vendedor después de compra exitosa
   */
  clearVendedor() {
    console.log('🗑️ Limpiando vendedor después de compra');
    
    try {
      localStorage.removeItem(VENDEDOR_KEY);
    } catch (e) {}
    
    this.deleteCookie(COOKIE_NAME);
  }

  /**
   * Verificar si hay vendedor en la URL y guardarlo
   */
  checkAndSaveFromURL() {
    const params = new URLSearchParams(window.location.search);
    const vendedorId = params.get('vendedor');
    
    if (vendedorId) {
      console.log(`🔗 Vendedor detectado en URL: ${vendedorId}`);
      this.saveVendedor(vendedorId);
      
      // Limpiar URL sin recargar página
      const url = new URL(window.location);
      url.searchParams.delete('vendedor');
      window.history.replaceState({}, '', url);
      
      return vendedorId;
    }
    
    return this.getVendedor();
  }

  /**
   * Obtener vendedor para enviar al backend en compra
   */
  getVendedorForPurchase() {
    const vendedor = this.getVendedor();
    if (vendedor) {
      console.log(`✅ Enviando vendedor al backend: ${vendedor}`);
    }
    return vendedor;
  }

  // Utilidades para cookies
  setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
}

// Exportar instancia única
const referralService = new ReferralService();
export default referralService;
