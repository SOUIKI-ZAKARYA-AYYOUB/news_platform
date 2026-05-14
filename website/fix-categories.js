const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Fixing categories in Supabase...');

  await supabase.from('categories').update({ name: 'Sport' }).eq('name', 'Sports');
  await supabase.from('categories').update({ name: 'Others' }).eq('name', 'World');
  
  // The app uses: Culture, Economy, Health, Others, Politics, Society, Sport, Technology
  // DB has: Politics, Economy, Health, Sport, Technology, Science, Entertainment, Education, Environment, Others
  // Let's rename Entertainment -> Culture
  await supabase.from('categories').update({ name: 'Culture' }).eq('name', 'Entertainment');
  
  // Let's rename Education -> Society
  await supabase.from('categories').update({ name: 'Society' }).eq('name', 'Education');
  
  const { data } = await supabase.from('categories').select('*').order('id');
  console.log('Categories in DB now:');
  console.log(data);
}

run();
