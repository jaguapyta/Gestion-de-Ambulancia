const prisma = require('../config/db');

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

module.exports = { getRoles };