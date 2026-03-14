# 🎮 Arena – 2D Browser Game

Przeglądarkowa gra akcji 2D (widok z góry). Walcz z zombie, przetrwaj kolejne fale i zdobywaj punkty!

## Sterowanie

| Klawisz | Akcja |
|---------|-------|
| `W A S D` | Ruch gracza |
| `SPACJA` | Strzał w kierunku ruchu |

## Ekran gry (HUD)

| Pozycja | Informacja |
|---------|------------|
| Lewy górny | Liczba graczy na arenie |
| Prawy górny | Punkty gracza |
| Lewy dolny | Liczba potworów na arenie |
| Prawy dolny | Liczba wrogich graczy |
| Środek dołu | Pasek HP gracza |
| Górny środek | Numer aktualnej fali |

## Jak uruchomić

### ▶ Lokalnie (Python – bez instalacji)

```bash
cd arena
python -m http.server 8080
```

Otwórz: [http://localhost:8080](http://localhost:8080)

### ▶ Lokalnie (Node.js / npx)

```bash
cd arena
npx serve .
```

### 🐳 Docker

```bash
cd arena
docker compose up --build
```

Otwórz: [http://localhost:8080](http://localhost:8080)

Zatrzymaj:

```bash
docker compose down
```

## Struktura projektu

```
arena/
├── index.html          # Punkt wejścia
├── main.js             # Bootstrap gry
├── style.css           # Style UI
├── Dockerfile          # Obraz nginx:alpine
├── docker-compose.yml  # Konfiguracja Docker Compose
├── nginx.conf          # Konfiguracja serwera nginx
└── src/
    ├── Game.js             # Główna klasa gry (game loop)
    ├── Arena.js            # Tło / granice areny
    ├── Vector2.js          # Matematyka 2D
    ├── entities/
    │   ├── Entity.js       # Klasa bazowa (HP, pozycja, kolizja)
    │   ├── Player.js       # Gracz sterowany klawiaturą
    │   ├── Bullet.js       # Pocisk
    │   ├── Enemy.js        # Abstrakcyjna klasa wroga
    │   ├── Zombie.js       # Wolny, twardy zombie (wzorzec)
    │   └── FastZombie.js   # Szybki runner-zombie
    ├── managers/
    │   ├── InputManager.js   # Obsługa klawiatury
    │   ├── EntityManager.js  # Kolizje, aktualizacja encji
    │   └── SpawnManager.js   # Fale wrogów (łatwe rozszerzanie)
    └── hud/
        └── HUD.js            # Nakładka UI na canvas
```

## Dodawanie nowych typów wrogów

1. Skopiuj `src/entities/Zombie.js` jako wzorzec
2. Zmień klasę i dostosuj parametry (`hp`, `speed`, `damage`, `scoreValue`)
3. Opcjonalnie nadpisz `drawBody(ctx)` i `onUpdate(dt)`
4. Dodaj wpis do tablicy `ENEMY_TYPES` w `src/managers/SpawnManager.js`:

```js
{
  factory: (pos) => new TwojNowy({ position: pos }),
  weight: 1,      // relatywna szansa spawnu
  minWave: 3,     // od której fali się pojawia
},
```

## Technologie

- **Vanilla JavaScript** (ES6 Modules, OOP/klasy)
- **HTML5 Canvas API**
- **CSS3** (bez frameworków)
- **Docker** (nginx:alpine)
