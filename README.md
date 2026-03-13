# AI-Powered Student Study Companion

A comprehensive web application that helps students study efficiently by leveraging AI to process study materials, generate quizzes, and answer questions.

## Features

### 🎓 Study Material Management
- Upload and organize study materials (PDF, text notes)
- AI-powered summarization of content
- Automatic extraction of key topics

### 📝 Quiz Generation
- AI generates multiple-choice quizzes from study materials
- Adjustable difficulty levels (Easy, Medium, Hard)
- Instant feedback with explanations
- Performance tracking and weak topic identification

### 🤖 AI Q&A Assistant
- Ask questions about uploaded study materials
- Get contextual answers from the AI
- Learn at your own pace

### 📊 Progress Tracking
- Track quiz performance over time
- Identify weak topics based on quiz results
- View detailed performance analytics

## Tech Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Firebase Firestore** - Database
- **firebase-admin** - Firestore server SDK
- **OpenAI API** - AI capabilities
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **pdf-parse** - PDF text extraction

## Project Structure

```
ai/
├── server/                          # Backend
│   ├── src/
│   │   ├── config/                 # Configuration files
│   │   │   ├── database.js
│   │   │   └── openai.js
│   │   ├── controllers/            # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── materialController.js
│   │   │   ├── quizController.js
│   │   │   └── qaController.js
│   │   ├── middleware/             # Express middleware
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── models/                 # Database models
│   │   │   ├── User.js
│   │   │   ├── StudyMaterial.js
│   │   │   ├── Quiz.js
│   │   │   └── QuizResult.js
│   │   ├── routes/                 # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── materialRoutes.js
│   │   │   ├── quizRoutes.js
│   │   │   └── qaRoutes.js
│   │   ├── utils/                  # Utility functions
│   │   │   ├── pdfParser.js
│   │   │   └── aiHelper.js
│   │   └── index.js               # Entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── client/                          # Frontend
    ├── src/
    │   ├── pages/                  # Page components
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   └── MaterialDetail.js
    │   ├── components/             # Reusable components
    │   │   ├── MaterialCard.js
    │   │   └── QuizInterface.js
    │   ├── services/               # API service
    │   │   └── api.js
    │   ├── context/                # State management
    │   │   └── store.js
    │   ├── styles/                 # CSS files
    │   │   ├── Auth.css
    │   │   ├── Dashboard.css
    │   │   ├── MaterialCard.css
    │   │   ├── MaterialDetail.css
    │   │   └── QuizInterface.css
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── public/
    │   └── index.html
    ├── package.json
    ├── .env.example
    └── README.md
```

## Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- Firebase project with Firestore enabled
- OpenAI API key

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update environment variables in `.env`:
```
PORT=5000
JWT_SECRET=your_secure_secret_key_here
OPENAI_API_KEY=your_openai_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NODE_ENV=development
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account

### User
- `GET /api/user/profile` - Get user profile (protected)

### Study Materials
- `POST /api/materials/upload` - Upload study material (protected)
- `GET /api/materials` - Get all user materials (protected)
- `GET /api/materials/:id` - Get specific material (protected)
- `DELETE /api/materials/:id` - Delete material (protected)

### Quiz
- `POST /api/quiz/create` - Generate quiz from material (protected)
- `GET /api/quiz/:id` - Get quiz details (protected)
- `POST /api/quiz/submit` - Submit quiz answers (protected)
- `GET /api/quiz/results/all` - Get all quiz results (protected)

### Q&A
- `POST /api/qa/ask` - Ask question about material (protected)

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **File Upload Validation**: Restrict file types and sizes
- **CORS Protection**: Prevent cross-origin attacks
- **Protected Routes**: Client-side route protection
- **Data Validation**: Input validation on both frontend and backend

## How It Works

### 1. Material Upload Flow
- User uploads a PDF, text file, or pastes notes
- Backend extracts text (PDF parsing)
- OpenAI API processes the content:
  - Generates a concise summary
  - Extracts key topics and concepts
- Material stored in Firestore with AI-processed metadata

### 2. Quiz Generation Flow
- User selects a material and chooses difficulty level
- OpenAI API generates 5 multiple-choice questions with:
  - Clear question statements
  - 4 plausible answer options
  - Correct answer identification
  - Detailed explanations for learning
- Quiz presented to student interactively
- Answers validated and performance tracked

### 3. Q&A Assistant Flow
- User asks a question about a material
- OpenAI API uses material context to generate accurate answers
- Answer provided with contextual information

### 4. Performance Tracking
- Quiz results stored with user scores
- System tracks incorrect answers by topic
- Weak topics identified for focused studying

## Viva/Interview Preparation Points

### AI & NLP Concepts
- **Text Processing**: PDF parsing, content extraction
- **Prompt Engineering**: How we design prompts for OpenAI API
- **Context-Aware Responses**: Using material context for accurate Q&A
- **Token Optimization**: Efficient API usage with token limits

### Architecture & Design
- **Microservices-like Structure**: Separated concerns (auth, materials, quiz, QA)
- **JWT Authentication**: Stateless, scalable authentication
- **Database Design**: Proper schema relationships and indexing
- **Error Handling**: Graceful error management

### Security
- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Tokens**: Expiration, verification
- **File Upload Security**: Type validation, size limits
- **CORS**: Origin-based access control
- **Environment Variables**: Sensitive data protection

### Performance & Scalability
- **Database Queries**: Efficient filtering and population
- **File Storage**: Server-side file management
- **API Rate Limiting**: Handling OpenAI API constraints
- **Caching**: Potential for response caching

## Future Enhancements

- [ ] Real-time collaboration features
- [ ] Video lecture support and transcription
- [ ] Advanced analytics and learning insights
- [ ] Spaced repetition algorithm
- [ ] Community features (study groups, forums)
- [ ] Mobile app version
- [ ] Offline mode support
- [ ] Integration with educational platforms

## License

MIT

## Support

For issues and feature requests, please create an issue in the repository.
