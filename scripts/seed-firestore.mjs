import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore/lite';

const app = initializeApp({
  apiKey: 'AIzaSyDjq-TbQXamPulO1oLKHHHp23YFMIFYkCc',
  authDomain: 'commander-track.firebaseapp.com',
  projectId: 'commander-track',
  storageBucket: 'commander-track.firebasestorage.app',
  messagingSenderId: '762725315895',
  appId: '1:762725315895:web:eddab0e21ecb9b9b5956b2'
});
const db = getFirestore(app, 'default');

const PLAYERS = [
  { name: 'Alice',   imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
  { name: 'Bob',     imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  { name: 'Charlie', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' },
  { name: 'Diana',   imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana' },
  { name: 'Ethan',   imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan' },
  { name: 'Fiona',   imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona' }
];

const COMMANDERS = [
  { name: "Atraxa, Praetors' Voice",    colors: ['white','blue','black','green'],        img: 'https://cards.scryfall.io/art_crop/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg' },
  { name: 'Edgar Markov',               colors: ['white','black','red'],                 img: 'https://cards.scryfall.io/art_crop/front/8/d/8d94b8ec-ecda-43c8-a60e-1ba33e6a54a4.jpg' },
  { name: 'The Ur-Dragon',              colors: ['white','blue','black','red','green'],   img: 'https://cards.scryfall.io/art_crop/front/7/e/7e78b70b-0c67-4f14-8ad7-c9f8e3f59743.jpg' },
  { name: "Yuriko, the Tiger's Shadow", colors: ['blue','black'],                        img: 'https://cards.scryfall.io/art_crop/front/3/b/3bd81ae6-e628-447a-a36b-597e63ede295.jpg' },
  { name: 'Kaalia of the Vast',         colors: ['white','black','red'],                 img: 'https://cards.scryfall.io/art_crop/front/a/0/a0cc9eaf-c8d9-4da2-8fd8-8d423a02a3a8.jpg' },
  { name: 'Muldrotha, the Gravetide',   colors: ['blue','black','green'],                img: 'https://cards.scryfall.io/art_crop/front/c/6/c654c834-d0e7-42bb-bd3f-1f6fbedd4bc0.jpg' },
  { name: 'Nekusar, the Mindrazer',     colors: ['blue','black','red'],                  img: 'https://cards.scryfall.io/art_crop/front/3/f/3f7f2417-12de-4e57-9714-d878880a1208.jpg' },
  { name: 'Zur the Enchanter',          colors: ['white','blue','black'],                img: 'https://cards.scryfall.io/art_crop/front/2/5/253e19db-28a1-4909-b235-e02631a38c35.jpg' },
  { name: 'Omnath, Locus of Creation',  colors: ['white','blue','red','green'],           img: 'https://cards.scryfall.io/art_crop/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg' },
  { name: 'Krenko, Mob Boss',           colors: ['red'],                                 img: 'https://cards.scryfall.io/art_crop/front/c/d/cd9fec9d-23c8-4d35-97c1-9499527198fb.jpg' }
];

// Each player gets 1-2 decks (indexes into COMMANDERS)
const DECK_MAP = [[0,1],[2,3],[4,5],[6],[7,8],[9]];

async function seed() {
  const existing = await getDocs(collection(db, 'players'));
  if (existing.size > 0) {
    console.log(`\u26a0\ufe0f  "players" already has ${existing.size} docs. Skipping to avoid duplicates.`);
    process.exit(0);
  }

  console.log('\ud83d\udc64 Creating players...');
  const ids = [];
  for (const p of PLAYERS) {
    const ref = await addDoc(collection(db, 'players'), { name: p.name, imageUrl: p.imageUrl });
    ids.push(ref.id);
    console.log(`   \u2705 ${p.name} \u2192 ${ref.id}`);
  }

  console.log('\n\ud83c\udccf Creating decks...');
  let count = 0;
  for (let i = 0; i < PLAYERS.length; i++) {
    for (const ci of DECK_MAP[i]) {
      const c = COMMANDERS[ci];
      const ref = await addDoc(collection(db, 'decks'), {
        playerId: ids[i],
        commanderName: c.name,
        commanderImageUrl: c.img,
        colors: c.colors
      });
      count++;
      console.log(`   \u2705 ${PLAYERS[i].name} / ${c.name} \u2192 ${ref.id}`);
    }
  }

  console.log(`\n\ud83c\udf89 Done! ${ids.length} players, ${count} decks created.`);
  process.exit(0);
}

seed().catch(e => { console.error('\u274c Seed failed:', e.message); process.exit(1); });

