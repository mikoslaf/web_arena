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

Otwórz w sieci: [http://IP_VM](http://IP_VM)

Przykład: `http://10.40.31.245`

Mapowanie portów (host -> kontener):

- `8088 -> 80` (frontend + websocket `/ws`)
- Backend WebSocket (`:3217`) działa wewnątrz tego samego kontenera i nie jest wystawiany na hosta

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
├── Dockerfile          # Jeden obraz: nginx + node (backend)
├── docker-compose.yml  # Jedna usługa (jeden kontener)
├── nginx.conf          # Konfiguracja nginx + proxy /ws -> localhost:3217
├── docker/start.sh     # Start backendu i nginx w kontenerze
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

## Power-upy (losowe wzmocnienia)

Na mapie pojawiają się losowe bonusy:

- `+` apteczka (leczenie)
- `RF` szybsze strzelanie (czasowy buff)
- `S` tarcza (czasowa odporność na obrażenia)

System jest obiektowy i łatwy do rozbudowy:

- baza: `src/entities/powerups/PowerUp.js`
- typy: `src/entities/powerups/*.js`
- losowy spawn + wagi: `src/managers/PowerUpManager.js` (`POWERUP_TYPES`)

Aby dodać nowy bonus:

1. Utwórz klasę dziedziczącą po `PowerUp` i zaimplementuj `applyTo(player)`
2. Dodaj wpis do `POWERUP_TYPES` w `PowerUpManager.js`

## Boss na końcu fali

Na końcu każdej fali pojawia się `BossZombie`:

- większe HP i obrażenia niż zwykłe potwory
- losowy wygląd (wariant kolorystyki i detali)
- specjalne ataki:
  - `Charge` (szarża)
  - `Rage` (czasowe zwiększenie prędkości i obrażeń)

## Technologie

- **Vanilla JavaScript** (ES6 Modules, OOP/klasy)
- **HTML5 Canvas API**
- **CSS3** (bez frameworków)
- **Docker** (nginx:alpine)
