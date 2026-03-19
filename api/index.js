const users = new Map();
const verificationCodes = new Map();

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
    const { method, url } = req;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (method === 'OPTIONS') {
        return res.status(200).end();
    }

    const path = url.split('?')[0];

    if (path === '/api/send-code' && method === 'POST') {
        try {
            const { phone } = req.body;
            
            if (!phone || phone.length !== 11) {
                return res.status(400).json({ success: false, message: '手机号格式不正确' });
            }
            
            const code = generateCode();
            
            verificationCodes.set(phone, {
                code,
                expires: Date.now() + 5 * 60 * 1000
            });
            
            console.log(`验证码 for ${phone}: ${code}`);
            
            return res.status(200).json({ 
                success: true, 
                message: '验证码已发送',
                debugCode: code
            });
            
        } catch (error) {
            console.error('send-code error:', error);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    if (path === '/api/login' && method === 'POST') {
        try {
            const { phone, code } = req.body;
            
            if (!phone || phone.length !== 11) {
                return res.status(400).json({ success: false, message: '手机号格式不正确' });
            }
            
            if (!code || code.length !== 6) {
                return res.status(400).json({ success: false, message: '验证码格式不正确' });
            }
            
            const stored = verificationCodes.get(phone);
            
            if (!stored) {
                return res.status(400).json({ success: false, message: '请先获取验证码' });
            }
            
            if (Date.now() > stored.expires) {
                verificationCodes.delete(phone);
                return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
            }
            
            if (stored.code !== code) {
                return res.status(400).json({ success: false, message: '验证码错误' });
            }
            
            verificationCodes.delete(phone);
            
            let user = Array.from(users.values()).find(u => u.phone === phone);
            
            if (!user) {
                user = {
                    id: generateId(),
                    phone,
                    name: null,
                    createdAt: new Date().toISOString()
                };
                users.set(user.id, user);
            }
            
            return res.status(200).json({
                success: true,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name
                },
                data: user.data || null,
                isNewUser: !user.name
            });
            
        } catch (error) {
            console.error('login error:', error);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    if (path === '/api/sync' && method === 'POST') {
        try {
            const { userId, data } = req.body;
            
            if (!userId) {
                return res.status(400).json({ success: false, message: '用户ID无效' });
            }
            
            const user = users.get(userId);
            
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }
            
            user.data = data;
            users.set(userId, user);
            
            return res.status(200).json({ success: true });
            
        } catch (error) {
            console.error('sync error:', error);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    if (path === '/api/set-name' && method === 'POST') {
        try {
            const { userId, name } = req.body;
            
            if (!userId) {
                return res.status(400).json({ success: false, message: '用户ID无效' });
            }
            
            if (!name || name.trim().length === 0) {
                return res.status(400).json({ success: false, message: '请输入昵称' });
            }
            
            const user = users.get(userId);
            
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }
            
            user.name = name.trim();
            users.set(userId, user);
            
            return res.status(200).json({ success: true, name: user.name });
            
        } catch (error) {
            console.error('set-name error:', error);
            return res.status(500).json({ success: false, message: '服务器错误' });
        }
    }

    return res.status(404).json({ message: 'Not Found' });
}
