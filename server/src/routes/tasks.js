const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET all tasks for the authenticated user
router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST create a new task
router.post('/', async (req, res) => {
  const { title, dueDate, priority } = req.body;

  if (!title || !dueDate || !priority) {
    return res.status(400).json({ error: '필수 필드를 입력해주세요.' });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        dueDate,
        priority,
        userId: req.userId,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// PUT update a task
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, dueDate, priority } = req.body;

  try {
    const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
    if (!task) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { title: title.trim(), dueDate, priority },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// PATCH toggle task completion status
router.patch('/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
    if (!task) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: task.status === 'done' ? 'todo' : 'done' },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// DELETE a task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const task = await prisma.task.findFirst({ where: { id, userId: req.userId } });
    if (!task) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }

    await prisma.task.delete({ where: { id } });
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
