const apiKey = 'AIzaSyC5ocIg1-Ct4uLfnmp7FVR1MZIm2g-6F4U';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

try {
  const res = await fetch(url);
  const data = await res.json();
  const models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
  console.log(models.map(m => m.name).join('\n'));
} catch (err) {
  console.error(err);
}
