require('dotenv').config();
const { faker } = require('@faker-js/faker');
const dayjs    = require('dayjs');

const connectDB = require('../db');
const User      = require('../models/User');
const Todo      = require('../models/Todo');
const Schedule  = require('../models/Schedule');

const NUM_TODOS     = 25;
const NUM_SCHEDULES = 15;

(async () => {
  try {
    await connectDB();

    /* 1) 데모 유저 확보 */
    const DEMO_ID = 'demo123';
    let user = await User.findOne({ id: DEMO_ID });
    if (!user) {
      user = new User({ id: DEMO_ID, nickname: '데모유저' });
      await user.setPassword('password123');
      await user.save();
      console.log('✅ Demo user created');
    }

    /* 2) 예전 더미 초기화 */
    await Promise.all([
      Todo.deleteMany({ owner: user._id }),
      Schedule.deleteMany({ owner: user._id }),
    ]);

    /* 3) Todo 생성 */
    const todos = Array.from({ length: NUM_TODOS }).map(() => ({
      title: faker.hacker.phrase().slice(0, 30),
      deadline: faker.date.between({
        from: dayjs().startOf('day').toDate(),
        to: dayjs().add(14, 'day').endOf('day').toDate()
      }),
      completed: faker.datatype.boolean(),
      owner: user._id,
    }));
    await Todo.insertMany(todos);
    console.log(`${NUM_TODOS} Todos inserted`);

    /* 4) Schedule 생성 */
    const schedules = [];
    for (let i = 0; i < NUM_SCHEDULES; i++) {
      const targetDay = dayjs().add(faker.number.int({ min: 0, max: 6 }), 'day');
      const startHour = faker.number.int({ min: 8, max: 18 });
      schedules.push({
        name:`${faker.word.adjective()} ${faker.word.noun()}`,
        date: targetDay.startOf('day').toDate(),
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime:   `${String(startHour + 2).padStart(2, '0')}:00`,
        owner: user._id,
      });
    }
    await Schedule.insertMany(schedules);
    console.log(`${NUM_SCHEDULES} Schedules inserted`);

    console.log('🎉 Dummy data seeding complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
