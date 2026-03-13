// Mock Quiz Generator for testing without OpenAI API
// Use this when OpenAI quota is exhausted
// Now generates content-specific questions based on material text

// Extract sentences and key terms from content
const extractKeyInfo = (content) => {
  if (!content) return { sentences: [], words: [] };
  
  // Get sentences (up to 20 chars minimum to filter out small sentences)
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .slice(0, 10);
  
  // Extract key words (longer words that might be key terms, min 5 chars)
  const words = content
    .match(/\b\w{5,}\b/g)
    ?.filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 15) || [];
  
  return { sentences, words };
};

// Generate dynamic questions based on material content and difficulty
const generateDynamicQuestions = (content, difficulty = 'medium') => {
  const { sentences, words } = extractKeyInfo(content);
  if (sentences.length === 0) {
    return generateGenericQuestions(difficulty);
  }

  const questions = [];

  // helper to pick or truncate a sentence for an option
  const pickSentence = (idx) => sentences[idx] ? sentences[idx].substring(0, 100) : '';

  if (difficulty === 'simple') {
    // basic recall/definition questions
    if (sentences[0]) {
      questions.push({
        question: `What is the main idea of the first sentence in the material?`,
        options: [
          pickSentence(0),
          pickSentence(1) || 'Another point mentioned',
          'An unrelated statement',
          'A generic fact'
        ],
        correctAnswer: pickSentence(0),
        explanation: 'This question tests basic understanding of the opening statement.'
      });
    }
    if (words[0]) {
      questions.push({
        question: `The term "${words[0]}" in the content most closely means:`,
        options: [
          'A fundamental concept from the material',
          'An unrelated topic',
          'A synonym of another word',
          'A term not used'
        ],
        correctAnswer: 'A fundamental concept from the material',
        explanation: `"${words[0]}" was highlighted as a key term in the passage.`
      });
    }
    // pad with simple generic if needed
  } else if (difficulty === 'medium') {
    // conceptual / application questions
    if (sentences[0]) {
      questions.push({
        question: `Why is the idea in the first sentence important in the context of the material?`,
        options: [
          'It provides foundational understanding',
          'It is irrelevant',
          'It contradicts other points',
          'It is an example only'
        ],
        correctAnswer: 'It provides foundational understanding',
        explanation: 'The first sentence sets up a key concept that the rest of the material builds on.'
      });
    }
    if (sentences[1]) {
      questions.push({
        question: `How could the concept mentioned in the material be applied in a real-world scenario?`,
        options: [
          'By using it as a framework for decision making',
          'By ignoring it entirely',
          'By memorizing it without practice',
          'By treating it as trivia'
        ],
        correctAnswer: 'By using it as a framework for decision making',
        explanation: 'Application-based question encourages reasoning beyond definitions.'
      });
    }
  } else if (difficulty === 'hard') {
    // analytical / scenario-based questions
    if (sentences[2]) {
      questions.push({
        question: `Suppose a student misinterprets the concept described in the material. What is the most likely consequence?`,
        options: [
          'They will apply it incorrectly in a complex situation',
          'They will ignore the material entirely',
          'They will achieve perfect results',
          'They will not notice any difference'
        ],
        correctAnswer: 'They will apply it incorrectly in a complex situation',
        explanation: 'Hard questions require thinking through implications and consequences.'
      });
    }
    if (sentences[3]) {
      questions.push({
        question: `In a scenario where ${pickSentence(3)}, what would be the best course of action?`,
        options: [
          'Analyze the situation step-by-step and choose accordingly',
          'Ignore the scenario',
          'Assume the opposite outcome',
          'Refer to unrelated material'
        ],
        correctAnswer: 'Analyze the situation step-by-step and choose accordingly',
        explanation: 'Scenario-based questions promote multi-step reasoning.'
      });
    }
  }

  // If not enough questions constructed above, fill in with generic ones appropriate to difficulty
  while (questions.length < 5) {
    questions.push(generateGenericQuestions(difficulty)[0]);
  }

  return questions.slice(0, 5);
};

// Generic questions fallback
const generateGenericQuestions = (difficulty = 'medium') => {
  const genericQuestions = {
    easy: [
      {
        question: "Which statement best describes effective learning?",
        options: [
          "Actively engaging with the material",
          "Memorizing without understanding",
          "Reading quickly without focus",
          "Avoiding difficult concepts"
        ],
        correctAnswer: "Actively engaging with the material",
        explanation: "Active engagement with study material leads to better retention and understanding."
      },
      {
        question: "What is the first step in understanding new material?",
        options: [
          "Reading and identifying main ideas",
          "Skipping to practice questions",
          "Memorizing key terms",
          "Writing summaries before reading"
        ],
        correctAnswer: "Reading and identifying main ideas",
        explanation: "Understanding the main ideas first provides a foundation for learning the details."
      },
      {
        question: "Which of the following helps improve comprehension?",
        options: [
          "Taking notes while reading",
          "Reading passively",
          "Avoiding questions",
          "Rushing through material"
        ],
        correctAnswer: "Taking notes while reading",
        explanation: "Note-taking actively engages your mind with the material, improving understanding."
      },
      {
        question: "What should you do after completing a study session?",
        options: [
          "Review key concepts learned",
          "Immediately move to other topics",
          "Forget what you learned",
          "Take a very long break"
        ],
        correctAnswer: "Review key concepts learned",
        explanation: "Regular review reinforces learning and improves long-term retention."
      },
      {
        question: "How can you test your understanding of material?",
        options: [
          "By attempting practice questions and quizzes",
          "By re-reading the same section",
          "By avoiding assessments",
          "By guessing answers"
        ],
        correctAnswer: "By attempting practice questions and quizzes",
        explanation: "Practice questions reveal gaps in understanding and reinforce learning."
      }
    ],
    medium: [
      {
        question: "Why is it important to connect new information to prior knowledge?",
        options: [
          "It helps you understand and remember concepts better",
          "It wastes time and effort",
          "It makes the material harder",
          "It is only useful for definitions"
        ],
        correctAnswer: "It helps you understand and remember concepts better",
        explanation: "Linking new ideas to what you already know strengthens comprehension and recall."
      },
      {
        question: "How would you apply a theory to solve a practical problem?",
        options: [
          "Analyze the situation, choose relevant concepts, and implement a solution",
          "Ignore the theory and guess",
          "Memorize the theory without using it",
          "Ask someone else to do it"
        ],
        correctAnswer: "Analyze the situation, choose relevant concepts, and implement a solution",
        explanation: "Application-based questions encourage reasoning and problem-solving."
      },
      {
        question: "When might a concept learned be misleading if taken out of context?",
        options: [
          "When you ignore surrounding information and conditions",
          "When you always apply it correctly",
          "When the material is too long",
          "When you memorize definitions"
        ],
        correctAnswer: "When you ignore surrounding information and conditions",
        explanation: "Context is key to correctly applying concepts; misinterpretation leads to errors."
      },
      {
        question: "What does reasoning through multiple steps help you achieve?",
        options: [
          "A deeper understanding and accurate conclusions",
          "Confusion and mistakes",
          "Faster memorization",
          "Avoiding studying"
        ],
        correctAnswer: "A deeper understanding and accurate conclusions",
        explanation: "Complex reasoning is necessary for medium and hard level questions."
      },
      {
        question: "Which question type best evaluates conceptual understanding?",
        options: [
          "Why or how questions that require explanation",
          "Simple yes/no questions",
          "Remembering a date",
          "Choosing a random fact"
        ],
        correctAnswer: "Why or how questions that require explanation",
        explanation: "Conceptual understanding is demonstrated by explaining reasoning."
      }
    ],
    hard: [
      {
        question: "In a scenario where a key assumption is violated, what is the most logical next step?",
        options: [
          "Re-evaluate the assumptions and adapt the approach",
          "Proceed as if nothing changed",
          "Abandon the material",
          "Ask someone else to decide"
        ],
        correctAnswer: "Re-evaluate the assumptions and adapt the approach",
        explanation: "Hard questions involve analytical thinking and adjusting to changing conditions."
      },
      {
        question: "When solving a multi-step problem based on the material, what is critical?",
        options: [
          "Breaking it into stages and verifying each before moving on",
          "Skipping steps to save time",
          "Guessing the final answer",
          "Focusing only on definitions"
        ],
        correctAnswer: "Breaking it into stages and verifying each before moving on",
        explanation: "Problem-solving at the hard level requires methodical, stepwise reasoning."
      },
      {
        question: "Which action demonstrates deep conceptual mastery?",
        options: [
          "Explaining why something works and predicting outcomes",
          "Reciting a definition verbatim",
          "Copying notes from someone else",
          "Avoiding complex examples"
        ],
        correctAnswer: "Explaining why something works and predicting outcomes",
        explanation: "Advanced mastery is shown by explaining mechanisms and foreseeing implications."
      },
      {
        question: "How would you handle conflicting information within the material?",
        options: [
          "Analyze the source of conflict and integrate or prioritize concepts",
          "Ignore one part completely",
          "Assume both are correct without checking",
          "Give up on understanding"
        ],
        correctAnswer: "Analyze the source of conflict and integrate or prioritize concepts",
        explanation: "Hard-level questions encourage critical evaluation and synthesis."
      },
      {
        question: "Why are scenario-based questions valuable for deep learning?",
        options: [
          "They simulate real problems requiring multi-step thought",
          "They are easier to answer",
          "They focus on trivia",
          "They avoid analysis"
        ],
        correctAnswer: "They simulate real problems requiring multi-step thought",
        explanation: "Scenario questions mimic complex situations and test high-order thinking."
      }
    ]
  };
  
  return genericQuestions[difficulty] || genericQuestions.medium;
};

const mockQuizzes = {
  easy: [
    {
      question: "What is the primary purpose of network protocols?",
      options: [
        "To establish communication rules between devices",
        "To encrypt data transmission",
        "To increase internet speed",
        "To manage user passwords"
      ],
      correctAnswer: "To establish communication rules between devices",
      explanation: "Network protocols define the rules and standards for communication between devices on a network."
    },
    {
      question: "Which layer of the OSI model handles routing?",
      options: [
        "Application Layer",
        "Data Link Layer",
        "Network Layer",
        "Transport Layer"
      ],
      correctAnswer: "Network Layer",
      explanation: "The Network Layer (Layer 3) is responsible for routing packets between networks."
    },
    {
      question: "What does TCP stand for?",
      options: [
        "Transfer Control Protocol",
        "Transmission Control Protocol",
        "Transport Control Protocol",
        "Technical Communication Protocol"
      ],
      correctAnswer: "Transmission Control Protocol",
      explanation: "TCP (Transmission Control Protocol) is a core protocol of the Internet Protocol Suite."
    },
    {
      question: "Which protocol operates at the Application Layer?",
      options: [
        "IP",
        "TCP",
        "HTTP",
        "Ethernet"
      ],
      correctAnswer: "HTTP",
      explanation: "HTTP (HyperText Transfer Protocol) operates at Layer 7, the Application Layer."
    },
    {
      question: "What is the main advantage of UDP over TCP?",
      options: [
        "UDP is more reliable",
        "UDP is faster with less overhead",
        "UDP guarantees packet delivery",
        "UDP encrypts data automatically"
      ],
      correctAnswer: "UDP is faster with less overhead",
      explanation: "UDP is connectionless and has less overhead than TCP, making it faster but less reliable."
    }
  ],
  medium: [
    {
      question: "Explain the three-way handshake in TCP.",
      options: [
        "SYN, SYN-ACK, ACK",
        "SYN, ACK, FIN",
        "ACK, SYN-ACK, SYN",
        "DATA, ACK, FIN"
      ],
      correctAnswer: "SYN, SYN-ACK, ACK",
      explanation: "The three-way handshake establishes a TCP connection: client sends SYN, server responds with SYN-ACK, client sends ACK."
    },
    {
      question: "What is the difference between IPv4 and IPv6?",
      options: [
        "IPv6 has larger address space",
        "IPv4 is faster",
        "IPv6 is only for local networks",
        "IPv4 provides better security"
      ],
      correctAnswer: "IPv6 has larger address space",
      explanation: "IPv6 uses 128-bit addresses (vs IPv4's 32-bit), providing vastly more addresses for future growth."
    },
    {
      question: "How does DNS resolution work?",
      options: [
        "Direct connection to website servers",
        "Query to DNS resolver which queries nameservers",
        "Automatic encryption of domain names",
        "Caching at router level only"
      ],
      correctAnswer: "Query to DNS resolver which queries nameservers",
      explanation: "DNS resolution involves querying a recursive resolver, which then queries authoritative nameservers to translate domain names to IP addresses."
    },
    {
      question: "What is the purpose of DHCP?",
      options: [
        "To encrypt network traffic",
        "To automatically assign IP addresses to devices",
        "To filter malicious packets",
        "To compress data transmission"
      ],
      correctAnswer: "To automatically assign IP addresses to devices",
      explanation: "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses and other network configuration to devices."
    },
    {
      question: "Describe packet fragmentation in IP networks.",
      options: [
        "Breaking large packets into smaller ones for transmission",
        "Combining small packets into larger ones",
        "Encrypting packet contents",
        "Removing duplicate packets"
      ],
      correctAnswer: "Breaking large packets into smaller ones for transmission",
      explanation: "When a packet exceeds the MTU (Maximum Transmission Unit) of a network, it must be fragmented into smaller packets."
    }
  ],
  hard: [
    {
      question: "Explain congestion control mechanisms in TCP.",
      options: [
        "Sliding window and congestion window",
        "Only packet retransmission",
        "Random packet dropping",
        "Source IP filtering"
      ],
      correctAnswer: "Sliding window and congestion window",
      explanation: "TCP uses sliding window for flow control and congestion window to prevent network congestion through algorithms like AIMD (Additive Increase, Multiplicative Decrease)."
    },
    {
      question: "What are the implications of NAT (Network Address Translation)?",
      options: [
        "Increased security and IP address conservation",
        "Improved network speed",
        "Better encryption",
        "Automatic protocol conversion"
      ],
      correctAnswer: "Increased security and IP address conservation",
      explanation: "NAT allows multiple devices to share a single public IP address while hiding internal network structure, improving security and conserving IPv4 addresses."
    },
    {
      question: "How does OSPF differ from BGP routing protocols?",
      options: [
        "OSPF is for interior routing, BGP for exterior routing",
        "BGP is faster than OSPF",
        "OSPF uses BGP internally",
        "They are identical protocols"
      ],
      correctAnswer: "OSPF is for interior routing, BGP for exterior routing",
      explanation: "OSPF (Open Shortest Path First) is an IGP (Interior Gateway Protocol) for within AS, while BGP (Border Gateway Protocol) is an EGP for between AS."
    },
    {
      question: "Explain the role of TTL (Time To Live) in IP packets.",
      options: [
        "Prevents infinite loops by decrementing at each hop",
        "Encrypts data for security",
        "Measures bandwidth usage",
        "Controls packet size"
      ],
      correctAnswer: "Prevents infinite loops by decrementing at each hop",
      explanation: "TTL is decremented at each router hop; when TTL reaches 0, the packet is discarded, preventing routing loops."
    },
    {
      question: "What is the purpose of Quality of Service (QoS)?",
      options: [
        "Prioritize traffic and guarantee bandwidth for critical applications",
        "Increase overall network speed",
        "Automatically encrypt all traffic",
        "Remove duplicate packets only"
      ],
      correctAnswer: "Prioritize traffic and guarantee bandwidth for critical applications",
      explanation: "QoS mechanisms prioritize certain traffic types (like VoIP) and can guarantee minimum bandwidth, latency, and reliability requirements."
    }
  ]
};

/**
 * Generate mock quiz questions based on content and difficulty
 * Use this when OpenAI API is unavailable
 * Now generates content-specific questions when material content is provided
 */
const generateMockQuiz = (contentOrDifficulty = 'medium', difficulty = 'medium') => {
  // Support both old signature generateMockQuiz(difficulty) and new generateMockQuiz(content, difficulty)
  let content = '';
  let difficultyLevel = 'medium';
  
  // If first param looks like content (longer than typical difficulty string)
  if (typeof contentOrDifficulty === 'string' && contentOrDifficulty.length > 20) {
    content = contentOrDifficulty;
    difficultyLevel = difficulty || 'medium';
  } else {
    // Old signature: just difficulty level
    difficultyLevel = contentOrDifficulty || 'medium';
  }

  // If we have content, generate dynamic questions from it
  if (content && content.length > 50) {
    console.log('[MOCK] Generating content-specific questions from material');
    return generateDynamicQuestions(content, difficultyLevel);
  }

  // Fall back to generic mock questions
  console.log('[MOCK] Using generic mock questions for difficulty:', difficultyLevel);
  const quizzes = mockQuizzes[difficultyLevel] || mockQuizzes.medium;
  return quizzes;
};

/**
 * Generate mock answer to a question based on content
 */
const formatTutorFallback = ({ topic, explanation, keyPoints, example, focusMode = false }) => {
  const safeTopic = topic || 'Study Topic';
  const youtubeLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(safeTopic)}`;

  if (focusMode) {
    return [
      `Topic: ${safeTopic}`,
      `Short Explanation: ${explanation}`,
      'Key Points:',
      `- ${keyPoints[0] || 'Review the core definition first.'}`,
      `- ${keyPoints[1] || 'Practice one quick example.'}`,
      `YouTube Search: ${youtubeLink}`,
    ].join('\n');
  }

  return [
    `Topic: ${safeTopic}`,
    `Explanation: ${explanation}`,
    'Key Points:',
    `- ${keyPoints[0] || 'Understand the main idea clearly.'}`,
    `- ${keyPoints[1] || 'Break the topic into smaller parts.'}`,
    `- ${keyPoints[2] || 'Practice with one simple question.'}`,
    `Example: ${example || 'A student reviews one concept and applies it in a simple daily-life scenario.'}`,
    `YouTube Search: ${youtubeLink}`,
  ].join('\n');
};

const generateMockAnswer = (question, materialContent = '', options = {}) => {
  const focusMode = options?.mode === 'focus';
  const topic = (question || 'Study Topic').trim().slice(0, 60);

  // If we have material content, try to generate a more relevant answer
  if (materialContent && materialContent.length > 50) {
    const { sentences } = extractKeyInfo(materialContent);
    if (sentences.length > 0) {
      // Return a sentence from the material as a relevant answer
      const relevantSentence = sentences[Math.floor(Math.random() * sentences.length)];
      return formatTutorFallback({
        topic,
        explanation: `Based on your uploaded material: ${relevantSentence}`,
        keyPoints: [
          'This answer is derived from your material context.',
          'Focus on understanding the core sentence shown above.',
          'Review related lines in your material for reinforcement.',
        ],
        example: 'If your notes discuss photosynthesis, connect this sentence to how plants make food in daylight.',
        focusMode,
      });
    }
  }

  // Fall back to generic mock answers
  const mockAnswers = {
    'what is': 'This is an important concept. Based on the material you provided, this relates to the key topics covered in your study material.',
    'how does': 'The process involves several steps: First, initialization occurs. Second, processing takes place. Finally, completion finishes the operation. This ensures proper functioning of the concept.',
    'explain': 'This concept is fundamental to the topic you are studying. It involves multiple components working together effectively.',
    'why': 'The reason for this is to ensure effectiveness, reliability, and proper implementation. This approach allows for better results and understanding.',
    'can you': 'Yes, based on the material provided, this is possible and is an important application of the concepts discussed.',
    'default': 'Based on the study material provided, this is an important concept. The key aspects involve proper understanding and application of the principles discussed in your material.'
  };

  for (const key in mockAnswers) {
    if (question.toLowerCase().includes(key)) {
      return formatTutorFallback({
        topic,
        explanation: mockAnswers[key],
        keyPoints: [
          'Identify the key term in the question.',
          'Link the concept to your class notes.',
          'Revise with a short practice question.',
        ],
        example: 'A student compares this concept with a real classroom example and remembers it faster.',
        focusMode,
      });
    }
  }
  return formatTutorFallback({
    topic,
    explanation: mockAnswers.default,
    keyPoints: [
      'Start with the core definition.',
      'Understand why the concept matters.',
      'Apply it in one simple scenario.',
    ],
    example: 'A student explains the topic to a friend using one daily-life example.',
    focusMode,
  });
};

module.exports = {
  generateMockQuiz,
  generateMockAnswer
};
