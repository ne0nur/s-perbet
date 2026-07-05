
const { spawn } = require('child_process');
const path = require('path');

const answers = ['y', '1.0.0', 'superbet', 'superbet'];
let answerIndex = 0;

const child = spawn('npx', ['@bubblewrap/cli', 'build'], {
  cwd: '/home/ne0nur/Projekte/fussball-tipprunde/android',
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, JAVA_HOME: '/usr/lib/jvm/java-17-openjdk' }
});

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  
  // Auto-answer prompts
  if (text.includes('?') && answerIndex < answers.length) {
    const answer = answers[answerIndex++];
    process.stderr.write(`\n[AUTO ANSWER: ${answer}]\n`);
    child.stdin.write(answer + '\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  if (code === 0) {
    // Look for APK
    const { execSync } = require('child_process');
    try {
      const result = execSync('find . -name "*.apk" -type f', { cwd: '/home/ne0nur/Projekte/fussball-tipprunde/android' });
      console.log('APK files found:\n' + result.toString());
    } catch(e) {}
  }
});

setTimeout(() => {
  console.log('\nTimeout - killing process');
  child.kill();
}, 300000); // 5 min timeout
