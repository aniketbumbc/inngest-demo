import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'test-app' });

export const helloWorld = inngest.createFunction(
  { id: 'hello-world', triggers: { event: 'test/hello-world' } },
  async ({ event, step }) => {
    console.log('Hello, world!');
    console.log('Event name', event.name);
    console.log('Event data', event.data);
    return {
      message: `${event.name} ${event.data} || Hello World`,
      recievedAt: new Date().toISOString(),
    };
  },
);

console.log('Function created', helloWorld.id());

export const multistepFunction = inngest.createFunction(
  {
    id: 'multistep-function-demo',
    triggers: { event: 'test/multistep-function-demo' },
  },
  async ({ event, step }) => {
    const firstTask = await step.run('step-1', async () => {
      // step 1 create 1 task hold it
      console.log(' Executing Step 1');
      return {
        message: 'Step 1 executed' + ' ' + event.data.name,
        recievedAt: new Date().toISOString(),
      };
    });

    console.log('First task result ', firstTask);

    const secondTask = await step.sleep('step-2-wait', 5000, async () => {
      console.log(' Executing Step 2');
      return {
        message: `Step 2 executed ${firstTask.message}`,
        recievedAt: new Date().toISOString(),
      };
    });
    console.log('Second task result ', secondTask);

    // step 3
    const thirdTask = await step.run('step-3', async () => {
      console.log(' Executing Step 3');
      return {
        message: `Step 3 executed ${firstTask?.message} ${secondTask?.message}`,
        previousTask: {
          message: [secondTask?.message, firstTask?.message],
          recievedAt: [secondTask?.recievedAt, firstTask?.recievedAt],
        },
        recievedAt: new Date().toISOString(),
      };
    });
    console.log('Third task result ', thirdTask);

    return {
      message: `Multistep function executed from async step ${firstTask?.message} ${thirdTask?.message}`,
      recievedAt: new Date().toISOString(),
    };
  },
);
console.log('Multistep Function created', multistepFunction.id());
