# 🤖 HeliosBot - AI Chatbot (Funcționează INSTANT!)

HeliosBot funcționează **IMEDIAT** fără nicio configurare! Folosește 3 niveluri de AI:

## ✨ Funcționează acum!

Bot-ul folosește **Hugging Face** (gratuit, fără API key) + răspunsuri simple ca fallback.
**Nu trebuie să configurezi nimic** - pornește backend-ul și bot-ul funcționează!

```bash
cd backend
npm start
```

Apoi testează în orice room: apasă butonul 🤖 și pune o întrebare!

## 🎯 Niveluri de AI (ordine fallback):

### 1️⃣ Groq API (OPȚIONAL - cel mai bun)
- ✅ Model: Llama 3.1 70B (echivalent GPT-3.5)
- ✅ Complet GRATUIT - fără card
- ✅ 30 requests/min, 14,400/zi
- ⚙️ Setup: vezi secțiunea de mai jos

### 2️⃣ Hugging Face (ACTIV automat)
- ✅ Model: Mistral 7B
- ✅ **FĂRĂ API key necesar!**
- ✅ Funcționează instant
- ⚡ Răspunsuri AI reale, gratuit

### 3️⃣ Răspunsuri Simple (fallback final)
- ✅ Răspunsuri pre-programate inteligente
- ✅ Întotdeauna disponibil
- 💡 Sfaturi despre task-uri, colaborare, productivitate

## 🚀 UPGRADE la Groq (OPȚIONAL - pentru răspunsuri mai bune)

Dacă vrei răspunsuri AI mai bune, adaugă Groq API (2 minute):

### 1. Obține API Key Gratuit

1. Mergi la **https://console.groq.com**
2. Click pe **"Sign Up"** (sau "Sign In" dacă ai deja cont)
3. Completează cu email și parolă (FĂRĂ card de credit)
4. După login, click pe **"API Keys"** din meniul stânga
5. Click pe **"Create API Key"**
6. Copiază API key-ul generat (va arăta ca: `gsk_...`)

### 2. Adaugă API Key în Backend

Deschide fișierul **`backend/.env`** și adaugă key-ul:

```env
GROQ_API_KEY=gsk_your_key_here_paste_it_here
```

### 3. Repornește Backend-ul

```bash
cd backend
npm start
```

## 💬 Testează Bot-ul ACUM

1. Pornește backend-ul (dacă nu rulează):
   ```bash
   cd backend
   npm start
   ```

2. Deschide frontend-ul în browser

3. Intră într-un room și apasă butonul 🤖

4. Pune întrebări:
   - "Salut! Cum funcționează task-urile?"
   - "Cum pot colabora mai bine?"
   - "Dă-mi sfaturi de productivitate"
   - Orice altceva!

Bot-ul va răspunde inteligent folosind AI!

## 💬 Exemple de Întrebări

- "Salut! Cum mă poți ajuta?"
- "Care sunt cele mai bune practici pentru task management?"
- "Cum pot colabora mai eficient cu echipa?"
- "Dă-mi câteva sfaturi de productivitate"
- "Explică-mi cum funcționează gantt chart-ul"
- Orice altă întrebare! Bot-ul înțelege context și conversații naturale.

## 🔧 Troubleshooting

### Bot-ul răspunde cu "API key invalid"
- Verifică că ai copiat corect API key-ul în `.env`
- Asigură-te că nu există spații înainte/după key
- Repornește backend-ul după modificarea `.env`

### Bot-ul răspunde cu "Prea multe cereri"
- Groq are limit de 30 requests/minut (tier gratuit)
- Așteaptă 1 minut și încearcă din nou
- Limita se resetează automat

### Bot-ul nu răspunde deloc
- Verifică că backend-ul rulează
- Verifică consolă pentru erori
- Asigură-te că ești membru al room-ului

## 📊 Limite Free Tier Groq

- **30 requests/minut**
- **14,400 requests/zi**
- **6,000 tokens/request**
- Mai mult decât suficient pentru testare și usage normal!

## 🔄 Alternative (dacă Groq nu funcționează)

### Hugging Face (complet gratuit, fără înregistrare)
```javascript
// În chatbot.js, schimbă cu:
const HF_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1';
// Fără API key necesar!
```

### OpenAI (plătit)
- Necesită API key plătit
- ~$0.002 per request
- Mai precis dar cu costuri

## 🎯 Features Implementate

- ✅ Răspunsuri AI contextuale și inteligente
- ✅ Memorie conversației (ultimele 10 mesaje)
- ✅ Răspunde în română sau engleză
- ✅ Înțelege context despre Helios platform
- ✅ Styling special pentru mesajele bot-ului
- ✅ Indicator vizual 🤖 AI în chat

---

**Succes! Bot-ul tău AI este gata să ajute utilizatorii!** 🎉
