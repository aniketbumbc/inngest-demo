import express from 'express';
import { inngest } from './inngest/client';
import { serve } from 'inngest/express';
import { functions } from './inngest/functions';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}, ${req.path}`);
  next();
});

app.use(
  '/api/inngest',
  serve({ client: inngest as any, functions: functions }),
);

app.get('/', (req, res) => {
  res.json({ message: 'Hello World', status: 'express-with-inngest' });
});

app.post('/test-hello-world', async (req, res) => {
  try {
    console.log('Sending event to hello-world');
    const result = await inngest.send({
      name: 'test/hello-world',
      data: {
        name: req.body.name || 'World',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('Event sent to hello-world', result);
    res.json({
      message: 'Event sent to hello-world',
      result: result,
      //eventId: ids[0],
    });
  } catch (error) {
    console.error('Error sending event to hello-world', error);
    res.status(500).json({ message: 'Internal server error', error: error });
  }
});

// test multistep function
app.post('/test-multistep-function', async (req, res) => {
  try {
    console.log('Sending event to multistep-function');
    const result = await inngest.send({
      name: 'test/multistep-function-demo',
      data: {
        name: req.body.name || 'World',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('Event sent to multistep-function', result);
    res.json({
      message: 'Event sent to multistep-function',
      result: result,
    });
  } catch (error) {
    console.error('Error sending event to multistep-function', error);
    res.status(500).json({ message: 'Internal server error', error: error });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
