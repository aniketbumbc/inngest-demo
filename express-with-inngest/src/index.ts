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

async function pollRunOutput(
  eventId: string,
  maxAttempts = 12,
  delayMs = 5000,
) {
  const url = `http://127.0.0.1:8288/api/v2/events/${eventId}/runs?includeOutput=true`;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Polling request failed (${response.status}): ${await response.text()}`,
        );
      } else {
        const json = await response.json();
        const run = json.data?.[0];

        if (run) {
          const status = String(run.status ?? '').toLowerCase();
          console.log(
            `[${new Date().toLocaleTimeString()}] Attempt ${i + 1}: Status is ${run.status}`,
          );

          if (status === 'completed') {
            return { success: true, output: run.output };
          }
          if (status === 'failed' || status === 'cancelled') {
            return {
              success: false,
              error: 'Inngest function run failed internally.',
            };
          }
        } else {
          console.log(
            `[${new Date().toLocaleTimeString()}] Attempt ${i + 1}: No run found yet`,
          );
        }
      }
    } catch (err) {
      console.error('Polling request error:', err);
    }

    // ⏱️ Waits exactly 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { success: false, error: 'Polling timed out after 60 seconds.' };
}

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
    const { ids } = await inngest.send({
      name: 'test/multistep-function-demo',
      data: {
        name: req.body.name || 'World',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('Event sent to multistep-function', ids[0]);
    const pollResult = await pollRunOutput(ids[0]);

    if (pollResult.success) {
      res.json({
        eventId: ids[0],
        status: 'Completed',
        result: pollResult.output,
      });
    } else {
      res
        .status(408)
        .json({
          eventId: ids[0],
          status: 'Timeout/Failed',
          message: pollResult.error,
        });
    }
  } catch (error) {
    console.error('Error sending event to multistep-function', error);
    res.status(500).json({ message: 'Internal server error', error: error });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
