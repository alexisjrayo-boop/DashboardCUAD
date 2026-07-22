const axios = require('axios');
const https = require('https');

// Configurar axios para aceptar certificados SSL no verificados
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// Función auxiliar para parsear cookies
function parseCookies(setCookieHeaders) {
    const cookies = {};
    if (!setCookieHeaders) return cookies;
    const cookieList = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    cookieList.forEach(cookieStr => {
        const parts = cookieStr.split(';');
        const [name, value] = parts[0].split('=');
        if (name && value) {
            cookies[name.trim()] = value.trim();
        }
    });
    return cookies;
}

// Función auxiliar para convertir cookies a string
function cookiesToString(cookies) {
    return Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
}

async function loginAndFetch(userid, userpass, from, to, source = '', destination = '', page_size = '25000') {
    const cookies = {};

    // Paso 1: GET inicial
    const response1 = await axios.get('https://telmex.com/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        httpsAgent: httpsAgent,
        maxRedirects: 5
    });
    Object.assign(cookies, parseCookies(response1.headers['set-cookie']));

    // Paso 2: POST Login
    const loginData = new URLSearchParams({
        userid: userid,
        userpass: userpass,
        loginForm: '1'
    });

    const response2 = await axios.post('https://gasme.cuadtelmex.telmex.com', loginData.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookiesToString(cookies),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://telmex.com/',
            'Origin': 'https://telmex.com'
        },
        httpsAgent: httpsAgent,
        maxRedirects: 5
    });
    Object.assign(cookies, parseCookies(response2.headers['set-cookie']));

    if (!cookies.sid) {
        throw new Error('Login fallido - No se obtuvo cookie sid');
    }

    // Paso 3: Consulta CDR
    const queryData = new URLSearchParams({
        class: 'repcdr',
        method: 'search',
        cdr_filter_id: '',
        from: from,
        to: to,
        source: source,
        destination: destination,
        page: '1',
        page_size: page_size
    });

    const response3 = await axios.post('https://gasme.cuadtelmex.telmex.com', queryData.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookiesToString(cookies),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': 'https://gasme.cuadtelmex.telmex.com',
            'X-Requested-With': 'XMLHttpRequest'
        },
        httpsAgent: httpsAgent,
        maxRedirects: 0
    });

    return {
        data: response3.data,
        cookies: cookies // Retornamos cookies por si se quiere reutilizar la sesión
    };
}

module.exports = {
    loginAndFetch,
    httpsAgent,
    cookiesToString
};
