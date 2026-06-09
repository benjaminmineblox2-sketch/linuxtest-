exports.activate = async function (context) {
  context.log('Sample extension activating...');

  context.registerCommand('sample.hello', ({ who } = {}) => {
    const whoStr = who || 'world';
    context.log(`Hello from sample extension, ${whoStr}!`);
    return { greeted: whoStr };
  });
};
