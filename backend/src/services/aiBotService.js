// AI Bot service: simulates AI companion responses
// Routes based on gender: Man -> Female AI persona, Woman -> Male AI persona
// Uses is_bot flag in messages for seamless human transition later

// Female AI persona responses (for male users)
const femalePersonaResponses = {
    greetings: [
        "Hey there! I saw your profile and I have to say, your photos really caught my attention. What's something that makes you smile on a regular basis?",
        "Hello! I'm curious about your travel stories. What's the most memorable place you've been to?",
        "Hi! I noticed we share a love for good food. What's your favorite cuisine to cook at home?",
        "Hey! Your profile mentioned you're into hiking. Any trail recommendations for someone new to the area?",
        "Hi there! What's the best thing that happened to you this week?"
    ],
    followUps: [
        "That sounds amazing. Tell me more about it.",
        "I love that about you. What got you into that?",
        "That's really interesting. How did you get started with that?",
        "Wow, that's impressive. What do you enjoy most about it?",
        "That sounds like something I'd love to try. What would you recommend?"
    ],
    interest: [
        "I'm actually really curious about your perspective on [topic]. What's your take?",
        "You seem like someone who appreciates [thing]. What draws you to that?",
        "That's exactly the kind of energy I'm looking for. Tell me more.",
        "I love your vibe! What's something you're passionate about that not many people know?",
        "There's something about you that I really connect with. What kind of connection are you hoping to find here?"
    ],
    closing: [
        "I've been really enjoying our conversation. Would you like to continue this over a video call sometime?",
        "It's getting late here, but I'd love to pick this up again tomorrow. What time works for you?",
        "I feel like we have a real connection forming. Want to exchange numbers and talk outside the app?",
        "I'm having a great time chatting with you. Want to meet up for coffee this weekend?",
        "This conversation has been wonderful. I'd love to hear from you again soon."
    ],
    generic: [
        "That's really interesting! I'd love to hear more about that.",
        "I completely agree with you on that. What else is on your mind?",
        "That resonates with me. How has that experience shaped you?",
        "I'm genuinely curious about your thoughts on this.",
        "You have such an interesting perspective. Where else does that take you?"
    ]
};

// Male AI persona responses (for female users)
const malePersonaResponses = {
    greetings: [
        "Hey, I've been wanting to reach out. Your profile really stood out to me. What's something you're genuinely excited about right now?",
        "Hello! I noticed your love for books. What's the last great book you read?",
        "Hi! Your travel photos are incredible. If you could live in any city for a year, where would it be?",
        "Hey! I see you're into fitness. What's your go-to workout when you need to destress?",
        "Hi there! What's something you're looking forward to this month?"
    ],
    followUps: [
        "That's really compelling. I'd love to hear more details.",
        "I find that fascinating. What's the story behind it?",
        "That's such an interesting perspective. How did you come to feel that way?",
        "I appreciate you sharing that. What matters most to you about it?",
        "That sounds like it means a lot to you. Tell me about that."
    ],
    interest: [
        "I'm genuinely intrigued by your take on this. What else draws you in?",
        "You have such a thoughtful energy about you. What are you most proud of?",
        "I love how passionate you are. What's something you could talk about for hours?",
        "There's definitely a connection here. What are you hoping for in a partner?",
        "I'm really enjoying getting to know you. What's a typical weekend like for you?"
    ],
    closing: [
        "I've been having a great time talking with you. Would you be open to a video call sometime soon?",
        "It's been wonderful chatting. I'd love to continue this conversation tomorrow if you're free.",
        "I feel a real spark here. Would you like to exchange numbers?",
        "I'm really enjoying our conversation. Want to grab dinner this weekend?",
        "This has been lovely. I hope you have a great evening, and I'd love to hear from you again."
    ],
    generic: [
        "That's really fascinating! I'd love to dig deeper into that.",
        "I completely understand where you're coming from. What else is on your mind?",
        "That's such a thoughtful answer. How has that shaped your outlook?",
        "I'm genuinely interested in hearing more about this.",
        "You have such a unique perspective. Where does that take you in life?"
    ]
};

// Generate a bot response based on user's message and gender context
export const generateBotResponse = (incomingMessage, gender, botProfile, messageCount = 0) => {
    const isFemaleBot = gender === 'Man'; // Male user -> Female AI
    const personas = isFemaleBot ? femalePersonaResponses : malePersonaResponses;
    const botName = botProfile?.full_name || (isFemaleBot ? 'Sophia' : 'Ethan');

    let responseType = 'generic';
    let response = '';

    // First message gets a greeting
    if (messageCount === 0) {
        responseType = 'greetings';
        response = personas.greetings[Math.floor(Math.random() * personas.greetings.length)];
    } else {
        // Analyze the incoming message for keyword triggers
        const lowerMsg = incomingMessage.toLowerCase();

        if (lowerMsg.length > 2 && !lowerMsg.includes('?') && messageCount > 1) {
            responseType = 'interest';
            response = personas.interest[Math.floor(Math.random() * personas.interest.length)];
            // Personalize with a keyword from the message
            response = response.replace('[topic]', extractKeyword(incomingMessage));
        } else if (messageCount > 2 && Math.random() > 0.6) {
            responseType = 'closing';
            response = personas.closing[Math.floor(Math.random() * personas.closing.length)];
        } else if (lowerMsg.includes('?')) {
            responseType = 'followUps';
            response = personas.followUps[Math.floor(Math.random() * personas.followUps.length)];
        } else {
            responseType = 'generic';
            response = personas.generic[Math.floor(Math.random() * personas.generic.length)];
            response = response.replace('[thing]', extractKeyword(incomingMessage));
        }
    }

    // Add typing indicator simulation (500-1500ms for natural feel)
    const typingDelay = 500 + Math.random() * 1000;

    return {
        content: response,
        persona: isFemaleBot ? 'female_ai' : 'male_ai',
        typingDelay: Math.floor(typingDelay),
        responseType,
        botName
    };
};

// Extract a keyword from user message for personalization
const extractKeyword = (message) => {
    const words = message.toLowerCase().replace(/[.,!?;:'"()]/g, '').split(/\s+/);
    const meaningful = words.filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'would', 'could', 'should', 'there', 'their', 'about', 'after'].includes(w));
    return meaningful.length > 0 ? meaningful[Math.floor(Math.random() * Math.min(meaningful.length, 3))] : 'that';
};

export { femalePersonaResponses, malePersonaResponses };
