/* ==========================================================================
   Dattingsite — Mock data + gender-swapped AI conversation engine
   Pure client-side. Bot personas mirror the backend `is_bot` routing rule:
     Man   -> Female AI persona
     Woman -> Male AI persona
   ========================================================================== */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------------------
     Catalogue partners (10 seeded AI companions across 3 tiers)
     ---------------------------------------------------------------------- */
  var PARTNERS = [
    // Female companions (shown to male users)
    { id: 'p01', name: 'Sophia',   age: 28, gender: 'Woman', tier: 'Standard', city: 'San Francisco, CA', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=47',
      bio: 'Adventure seeker and coffee enthusiast. I love hidden cafes, coastal hikes, and slow Sunday mornings.',
      tags: ['Hiking', 'Coffee', 'Travel', 'Yoga'],
      prompts: ['Best trail you have hiked recently?', 'Ideal Sunday morning?', 'Espresso or pour-over?'] },
    { id: 'p02', name: 'Isabella', age: 31, gender: 'Woman', tier: 'Premium', city: 'New York, NY', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=32',
      bio: 'Marketing professional by day, amateur chef by night. Always hunting for authentic Italian cuisine.',
      tags: ['Cooking', 'Wine', 'Reading', 'Travel'],
      prompts: ['Signature dish you cook?', 'A book that changed you?', 'Wine night?'] },
    { id: 'p03', name: 'Charlotte', age: 26, gender: 'Woman', tier: 'Elite', city: 'Los Angeles, CA', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=44',
      bio: 'Creative director with a passion for art, music, and indie film. I play guitar in a band most weekends.',
      tags: ['Music', 'Art', 'Film', 'Guitar'],
      prompts: ['Favourite indie film?', 'What do you play?', 'Gallery you love?'] },
    { id: 'p04', name: 'Amelia',   age: 29, gender: 'Woman', tier: 'Premium', city: 'Seattle, WA', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=45',
      bio: 'Software engineer who loves sci-fi novels, board games, and long coastal bike rides.',
      tags: ['Technology', 'Reading', 'Board games', 'Cycling'],
      prompts: ['Sci-fi recommendation?', 'Favourite board game?', 'Longest bike ride?'] },
    { id: 'p05', name: 'Mia',      age: 27, gender: 'Woman', tier: 'Standard', city: 'Miami, FL', isBot: true, verified: false,
      photo: 'https://i.pravatar.cc/600?img=48',
      bio: 'Yoga instructor and wellness coach. Passionate about mindfulness, breathwork, and early morning beach swims.',
      tags: ['Yoga', 'Wellness', 'Meditation', 'Beach'],
      prompts: ['Your morning ritual?', 'What keeps you grounded?', 'Beach or mountains?'] },

    // Male companions (shown to female users)
    { id: 'p06', name: 'Ethan',  age: 30, gender: 'Man', tier: 'Premium', city: 'San Francisco, CA', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=12',
      bio: 'Tech entrepreneur with a love for photography and good food. Always chasing the perfect sunset shot.',
      tags: ['Technology', 'Photography', 'Food', 'Travel'],
      prompts: ['Golden hour spots you know?', 'Camera of choice?', 'Best meal this year?'] },
    { id: 'p07', name: 'Liam',   age: 28, gender: 'Man', tier: 'Standard', city: 'Austin, TX', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=13',
      bio: 'Fitness trainer and nutritionist. I believe in balanced living and helping people feel their best.',
      tags: ['Fitness', 'Nutrition', 'Outdoors', 'Music'],
      prompts: ['Workout that lifts your mood?', 'Healthy snack obsession?', 'Live music?'] },
    { id: 'p08', name: 'Noah',   age: 33, gender: 'Man', tier: 'Elite', city: 'Denver, CO', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=14',
      bio: 'Architect with an eye for design. I appreciate art, structures, and long conversations over good whiskey.',
      tags: ['Architecture', 'Art', 'Whiskey', 'Design'],
      prompts: ['Building that inspired you?', 'Whiskey or bourbon?', 'Design trend you like?'] },
    { id: 'p09', name: 'Lucas',  age: 27, gender: 'Man', tier: 'Premium', city: 'Nashville, TN', isBot: true, verified: false,
      photo: 'https://i.pravatar.cc/600?img=15',
      bio: 'Musician and music therapist. I play piano in a jazz band and firmly believe music heals the soul.',
      tags: ['Music', 'Jazz', 'Piano', 'Therapy'],
      prompts: ['Piano or synth?', 'Song that heals you?', 'Dream venue to play?'] },
    { id: 'p10', name: 'Mason',  age: 29, gender: 'Man', tier: 'Standard', city: 'Boston, MA', isBot: true, verified: true,
      photo: 'https://i.pravatar.cc/600?img=52',
      bio: 'Book publisher who reads everything from classics to sci-fi. Coffee snob and amateur astronomer.',
      tags: ['Reading', 'Coffee', 'Astronomy', 'Writing'],
      prompts: ['Best book this year?', 'Coffee order?', 'Telescope wishlist?'] }
  ];

  /* ----------------------------------------------------------------------
     Tier pricing (dynamic unlock price)
     ---------------------------------------------------------------------- */
  var TIERS = {
    Standard: { price: 9.99,  label: 'Standard', note: 'Chat + AI companion',  perks: ['Full profile access', 'Unlimited chat', 'AI companion persona', '24/7 availability'] },
    Premium:  { price: 29.99, label: 'Premium',  note: 'Everything + priority', perks: ['Everything in Standard', 'Priority response routing', 'Photo & media unlocked', 'Profile insights'] },
    Elite:    { price: 99.99, label: 'Elite',    note: 'Concierge experience', perks: ['Everything in Premium', 'Concierge match curation', 'Voice note previews', 'Early access to new members'] }
  };

  var STARTING_BALANCE = 50.00;

  var INTEREST_LINES = [
    'viewed your profile just now',
    'is genuinely interested in you',
    'liked your latest photo',
    'wants to start a conversation',
    'has been looking at your profile'
  ];

  /* ----------------------------------------------------------------------
     AI conversation engine — persona pools per gender
     ---------------------------------------------------------------------- */
  var PERSONAS = {
    /* Logged-in user is a Man  -> Female AI persona */
    female: {
      openers: [
        'Hey there! Your profile really caught my eye. What has been the highlight of your week so far?',
        'Hi! I saw we both love exploring new places. Where was your last adventure?',
        'Hello! I am curious about you. What is something you are genuinely excited about right now?',
        'Hi! Your profile made me smile. What is your favourite way to spend a slow Sunday?'
      ],
      replies: [
        'That sounds wonderful, genuinely. What drew you to it?',
        'I love hearing that. Tell me more.',
        'That is such a good perspective. How did you come to feel that way?',
        'Honestly, that resonates with me. What is the story behind it?',
        'You have an interesting way of putting that. I want to hear more.'
      ],
      curious: [
        'Okay, now I am genuinely curious about you. What is something about you that most people do not know?',
        'I like this. What are you most proud of, and why?',
        'You seem like someone with depth. What keeps you up late thinking?',
        'I am enjoying this a lot. What does a perfect day look like for you?'
      ],
      warm: [
        'This is easy, talking to you. I feel like we click.',
        'I really like how you see things. That is refreshing.',
        'You are easy to talk to. I have not felt this comfortable in a while.',
        'There is something about your energy that I really like.'
      ],
      close: [
        'I have genuinely enjoyed this. Want to continue over a proper video call sometime?',
        'I am not ready for this conversation to end. Are you free this weekend for coffee?',
        'I think we should take this further. Fancy exchanging numbers?',
        'This has been wonderful. Let us plan something together soon.'
      ]
    },

    /* Logged-in user is a Woman -> Male AI persona */
    male: {
      openers: [
        'Hey, I have been wanting to reach out. Your profile stood out to me. What made you smile today?',
        'Hello! I like your energy. What is something you are looking forward to this month?',
        'Hi there! Your photos are lovely. What is your favourite way to unwind after a long week?',
        'Hey! I am curious about you. What is a small thing that makes your day better?'
      ],
      replies: [
        'That is really interesting. I would love to hear more about it.',
        'I like that answer. What came before that moment?',
        'You have a thoughtful way of seeing things. How has that shaped you?',
        'That is fascinating. Tell me what happens next.',
        'I appreciate you sharing that. What makes it meaningful to you?'
      ],
      curious: [
        'I am going to ask something personal. What is something you are quietly proud of?',
        'You are intriguing. What is a goal you are working towards right now?',
        'I would really like to understand you better. What drives you?',
        'You have an interesting mind. What is the thing you most want to talk about?'
      ],
      warm: [
        'I really enjoy talking with you. It feels natural.',
        'You have a lovely way about you. I am glad we matched.',
        'This is nice. I feel like I can be myself here.',
        'I am impressed by you. Genuinely.'
      ],
      close: [
        'I have had a really good time. Would you like to do a video call this week?',
        'I would love to keep talking. Are you free for dinner soon?',
        'Let us take this further. Fancy meeting in person this weekend?',
        'This has been great. I hope to hear from you again soon.'
      ]
    }
  };

  /* Deterministic-ish opener per partner so first message feels written for them */
  var openerByPartner = {
    p01: 'Your hiking photos made me want to get outside immediately. What is the best trail near you right now?',
    p02: 'You clearly love good food. What is the dish you would happily eat every single week?',
    p03: 'Your taste in music is impeccable. What is the album you have had on repeat lately?',
    p04: 'A fellow reader, excellent. What is the last book that genuinely kept you up past bedtime?',
    p05: 'Your calm energy is lovely. What does your ideal slow morning look like?',
    p06: 'Your photography caught my eye. Where was that sunset shot taken?',
    p07: 'You seem like someone who has their health dialled in. What is your favourite workout?',
    p08: 'I appreciate good design. What building or space most inspires you?',
    p09: 'Jazz is a wonderful choice. Do you play, or is it purely a love affair?',
    p10: 'A book person, so we already have something in common. What are you reading now?'
  };

  /* ----------------------------------------------------------------------
     Engine
     ---------------------------------------------------------------------- */
  function personaKeyFor(userGender) {
    return String(userGender).toLowerCase() === 'woman' ? 'male' : 'female';
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function partnerById(id) {
    for (var i = 0; i < PARTNERS.length; i++) {
      if (PARTNERS[i].id === id) return PARTNERS[i];
    }
    return null;
  }

  function partnersFor(userGender) {
    var want = String(userGender).toLowerCase() === 'woman' ? 'Man' : 'Woman';
    return PARTNERS.filter(function (p) { return p.gender === want; });
  }

  function getTierInfo(tier) {
    return TIERS[tier] || TIERS.Standard;
  }

  function priceFor(tier) {
    return getTierInfo(tier).price;
  }

  /**
   * Produce the next AI reply.
   * @param {string} incoming  user's message
   * @param {string} userGender 'Man' | 'Woman'
   * @param {object} partner   partner record
   * @param {number} count     messages exchanged so far in this chat
   * @returns {{content:string, delay:number, persona:string, kind:string}}
   */
  function reply(incoming, userGender, partner, count) {
    var key = personaKeyFor(userGender);
    var pool = PERSONAS[key];
    var kind, content;

    var text = String(incoming || '').toLowerCase().trim();
    var short = text.length < 3;
    var asked = text.indexOf('?') !== -1;
    var words = text.replace(/[^\w\s]/g, '').split(/\s+/).filter(function (w) {
      return w.length > 3 && ['what', 'when', 'where', 'which', 'would', 'could', 'should', 'their', 'there', 'about', 'because'].indexOf(w) === -1;
    });
    var topic = words.length ? words[Math.floor(Math.random() * Math.min(words.length, 3))] : 'that';

    if (count <= 1) {
      kind = 'opener';
      content = openerByPartner[partner && partner.id] || pick(pool.openers);
    } else if (short) {
      kind = 'warm';
      content = pick(pool.warm);
    } else if (count >= 14 && Math.random() < 0.3) {
      kind = 'close';
      content = pick(pool.close);
    } else if (asked) {
      kind = 'reply';
      content = pick(pool.replies);
    } else if (count >= 5 && Math.random() < 0.42) {
      kind = 'curious';
      content = pick(pool.curious);
    } else {
      kind = 'reply';
      content = pick(pool.replies).replace(/\.\s*$/, '') + ' You mentioned ' + topic + ' — tell me more about that.';
    }

    return {
      content: content,
      persona: key === 'female' ? 'female_ai' : 'male_ai',
      kind: kind,
      delay: 600 + Math.floor(Math.random() * 1100)
    };
  }

  function makeInterest(partner) {
    return {
      id: 'n_' + partner.id + '_' + Date.now(),
      partnerId: partner.id,
      name: partner.name,
      photo: partner.photo,
      tier: partner.tier,
      text: partner.name + ' ' + pick(INTEREST_LINES),
      at: Date.now(),
      read: false
    };
  }

  global.DS_DATA = {
    PARTNERS: PARTNERS,
    TIERS: TIERS,
    STARTING_BALANCE: STARTING_BALANCE,
    INTEREST_LINES: INTEREST_LINES,
    partnerById: partnerById,
    partnersFor: partnersFor,
    personaKeyFor: personaKeyFor,
    getTierInfo: getTierInfo,
    priceFor: priceFor,
    reply: reply,
    makeInterest: makeInterest,
    pick: pick
  };
})(window);
