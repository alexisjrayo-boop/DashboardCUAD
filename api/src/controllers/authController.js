const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
    const { username, password, name, profile_picture, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Verificar si el usuario ya existe
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insertar usuario
        const [result] = await pool.query(
            'INSERT INTO users (username, password, name, profile_picture, email) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, name || username, profile_picture || null, email || null]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Buscar usuario
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verificar password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_picture: user.profile_picture,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, email, name, profile_picture, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error fetching users' });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, password, name, profile_picture, role, email } = req.body;

    try {
        const adminId = req.user.id;

        // Si es el admin maestro, no permitir cambio de rol ni de username por seguridad básica aérea
        const [userToUpdate] = await pool.query('SELECT username FROM users WHERE id = ?', [id]);
        if (userToUpdate.length > 0 && userToUpdate[0].username === 'admin') {
            if (role && role !== 'admin') {
                return res.status(403).json({ error: 'No se puede degradar el rol del administrador maestro' });
            }
        }

        // Si te estás editando a ti mismo, no permitas quitarte el rol de admin
        if (parseInt(id) === parseInt(adminId) && role === 'user') {
            return res.status(403).json({ error: 'No puedes quitarte tus propios privilegios de administrador' });
        }

        // Prepare query
        let query = 'UPDATE users SET username = ?, name = ?, profile_picture = ?, role = ?, email = ?';
        let params = [username, name, profile_picture, role || 'user', email || null];

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        res.status(500).json({ error: 'Error del servidor al actualizar usuario' });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id; // From verifyToken middleware

    try {
        // Impedir que un admin se elimine a sí mismo
        if (parseInt(id) === parseInt(adminId)) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }

        // Impedir eliminar al usuario 'admin' original
        const [userToDelete] = await pool.query('SELECT username FROM users WHERE id = ?', [id]);
        if (userToDelete.length > 0 && userToDelete[0].username === 'admin') {
            return res.status(403).json({ error: 'No se puede eliminar el usuario administrador maestro' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error del servidor al eliminar usuario' });
    }
};
