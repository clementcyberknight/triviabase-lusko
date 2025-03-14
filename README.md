# TriviaBase - Interactive On-Chain Q&A Platform

TriviaBase is a social on-chain trivia platform designed for communities, friends, events, webinars, and meetings. It empowers users to create engaging quizzes and Q&A sessions, while participants earn rewards, points, and NFTs based on their knowledge and participation.

## Idea

The idea for TriviaBase originated from the desire to make learning and engagement within communities more interactive and rewarding. Inspired by platforms like Slido and Kahoot, TriviaBase introduces a Web3 twist, enabling participants to stake rewards and earn NFTs, thus making Q&A games more dynamic and incentivized. By leveraging blockchain technology, TriviaBase enhances transparency, engagement, and ownership in interactive sessions.

## Key Features

*   **Live Trivia and Q&A Sessions:** Real-time quizzes and Q&A sessions to boost audience engagement.
*   **Token-Based Reward System (Optional):** Integrate a token-based system to reward knowledgeable participants.
*   **NFT Rewards** Mint nfts as rewards.
*   **On-Chain Transparency:** Leveraging blockchain to ensure fair play and verifiability.
*   **Gamification Elements:** Incorporated game-like elements to increase engagement and fun.
*   **Easy Integration:** Streamlined integration with events, webinars, and meetings.
*   **AI-Powered Question Generation:** Use AI to quickly generate engaging quiz questions.
*   **Social Onchain Q&A Game:** Provides players with opportunities to play, accumulate points, and earn NFTs and tokens.
## Architecture

TriviaBase is built using the following technologies:

*   **Next.js:** A React framework for building performant and scalable web applications.
*   **React:** A JavaScript library for building user interfaces.
*   **Thirdweb:** Tools and SDKs for building Web3 applications.
*   **Lukso Universal Profiles:** For secure and user-friendly wallet management.
*   **Firebase:** A Backend-as-a-Service platform for data storage, authentication, and real-time updates.
*   **Google Generative AI (Gemini):** For AI-powered question generation.
*   **Wagmi and Ethers:** For blockchain interactions.
*   **Tailwind CSS:** A utility-first CSS framework for styling.
*   **Farcaster Frame SDK:** For Social integrations

The core components of the architecture are as follows:

1.  **Frontend (./src/app/):** Built with Next.js and React, this part of the application handles the user interface, user interactions, and data presentation.
2.  **Components (./src/app/components/):** Reusable UI elements like the header, client layout, and more.
3.  **Pages (./src/app/pages/):** Different routes of the application including dashboard, game creation, leaderboard, and individual game modes.
4.  **Styles (./src/app/globals.css, tailwind.config.js):** Implements Tailwind CSS for styling the application.
5.  **Backend (FirebaseConfig.js):** Utilizes Firebase for real-time database, user authentication, and data storage.
6.  **Smart Contracts (./sc/):** Smart contracts written in Solidity and deployed on a blockchain. These contracts manage the reward system, token distribution, and on-chain game logic.
7.  **AI Integration:** Integrated Google Generative AI for automated quiz question generation.

## File Structure
Directory structure:
└── clementcyberknight-triviabase-lusko/
    ├── README.md
    ├── next.config.mjs
    ├── package.json
    ├── postcss.config.mjs
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── .eslintrc.json
    ├── public/
    │   ├── site.webmanifest
    │   ├── icons/
    │   └── .well-known/
    │       └── farcaster.json
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.js
        │   ├── page.js
        │   ├── robots.ts
        │   ├── sitemap.ts
        │   ├── components/
        │   │   ├── ClientLayout.js
        │   │   └── Header.tsx
        │   ├── fonts/
        │   │   ├── Aeonik.otf
        │   │   ├── AeonikTRIAL-Bold.otf
        │   │   ├── AeonikTRIAL-BoldItalic.otf
        │   │   ├── AeonikTRIAL-Light.otf
        │   │   ├── AeonikTRIAL-LightItalic.otf
        │   │   ├── AeonikTRIAL-RegularItalic.otf
        │   │   ├── GeistMonoVF.woff
        │   │   └── GeistVF.woff
        │   └── pages/
        │       ├── create_free_question/
        │       │   ├── page.tsx
        │       │   ├── previewquestion.js
        │       │   └── quizcreationpage.module.css
        │       ├── create_paid_question/
        │       │   ├── important.txt
        │       │   ├── page.tsx
        │       │   ├── previewquestion.js
        │       │   └── quizcreationpage.module.css
        │       ├── creategame/
        │       │   └── page.js
        │       ├── creategame07/
        │       │   └── page.js
        │       ├── dashboard/
        │       │   └── page.tsx
        │       ├── enter_mail/
        │       │   └── page.tsx
        │       ├── free_game_leaderboard/
        │       │   └── page.js
        │       ├── free_game_username/
        │       │   └── page.tsx
        │       ├── free_games/
        │       │   └── page.tsx
        │       ├── global_leaderboard/
        │       │   └── page.tsx
        │       ├── host_game_mode/
        │       │   └── page.js
        │       ├── host_leaderboard/
        │       │   └── page.js
        │       ├── host_wait_room/
        │       │   └── page.js
        │       ├── join_game/
        │       │   └── page.js
        │       ├── leaderboard/
        │       │   └── page.js
        │       ├── paid_final_leaderboard/
        │       │   └── page.tsx
        │       ├── paid_host_game_mode/
        │       │   └── page.js
        │       ├── paid_host_leaderboard/
        │       │   └── page.js
        │       ├── paid_leaderboard/
        │       │   └── page.js
        │       ├── paid_quizcode/
        │       │   └── page.tsx
        │       ├── paid_set_username/
        │       │   └── page.tsx
        │       ├── paid_temp_leaderboard/
        │       │   └── page.js
        │       ├── paid_user_game_mode/
        │       │   └── page.js
        │       ├── paid_user_waiting_room/
        │       │   └── page.js
        │       ├── paid_wait_room/
        │       │   └── page.tsx
        │       ├── set_username/
        │       │   └── page.js
        │       ├── setreward/
        │       │   └── page.tsx
        │       ├── temp_leaderboard/
        │       │   └── page.js
        │       ├── templates/
        │       │   ├── page.tsx
        │       │   ├── previewquestion.js
        │       │   └── quizcreationpage.module.css
        │       ├── user_game_mode/
        │       │   └── page.js
        │       ├── user_profile/
        │       │   └── page.tsx
        │       └── waiting_room/
        │           └── page.js
        ├── config/
        │   ├── FirebaseConfig.js
        │   └── wagmiConfig.ts
        └── sc/
            ├── MainnetTrivia.sol
            ├── adminBank.sol
            ├── ca.tsx
            ├── tokenabi.json
            ├── trivia.json
            ├── triviacreateabi.json
            └── triviasmc.sol
*   **README.md:** This file, providing an overview of the project.
*   **next.config.js:** Next.js configuration file.
*   **package.json:** Manages dependencies and project scripts.
*   **postcss.config.js, tailwind.config.js:** Configuration files for styling.
*   **public/:** Contains static assets, manifest, and other public files.
*   **src/app/:** Contains core application files like layout, pages, and components.
*   **src/config/:** Includes configurations for Firebase and Wagmi.
*   **src/sc/:** Smart contract files.

## Getting Started

1.  **Clone the repository:**

    ```bash
    git clone [repository URL]
    cd [repository name]
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Configure Firebase:**
    *   Set up a Firebase project on the Firebase Console ([https://console.firebase.google.com/](https://console.firebase.google.com/)).
    *   Enable Authentication and Realtime Database.
    *   Add your Firebase configuration to `src/config/FirebaseConfig.js`.

4.  **Add .env variables:**
    * You must add a .env variable with the name of ```NEXT_PUBLIC_GEMINI_API_KEY```
    * To use auto-generation you must add Gemini api

5.  **Run the development server:**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

6.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

Contributions are welcome! Feel free to submit pull requests, report issues, or suggest new features.
