const fs = require('fs');
const path = require('path');

function walkJsonFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walkJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name.startsWith('T')) files.push(full);
  }
  return files;
}

let totalFixed = 0;
const dataDir = path.join(__dirname, '..', 'questions', 'data');
const files = walkJsonFiles(dataDir);

for (const filePath of files) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.questions) continue;
  let fileFixed = 0;
  for (const q of data.questions) {
    if (q.type !== 'true_false') continue;
    const ca = q.correct_answer;
    if (ca === true || ca === 'true' || ca === 'True') {
      q.correct_answer = 'A';
      fileFixed++;
    } else if (ca === false || ca === 'false' || ca === 'False') {
      q.correct_answer = 'B';
      fileFixed++;
    }
  }
  if (fileFixed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    totalFixed += fileFixed;
    console.log(`  ${path.relative(dataDir, filePath)}: ${fileFixed} fixed`);
  }
}
console.log(`\nTotal: ${totalFixed} questions fixed across ${files.length} files checked`);
