/**
 * EcoSphere AI - Conversational Intelligence Engine
 * Provides dual-engine intelligence:
 * 1. Specialized Offline Intelligent Knowledge Engine (Zero API Key needed)
 * 2. Live Generative LLM Engine (Google Gemini & OpenAI compatible)
 * Strictly enforces a gentle, scientifically reliable, compassionate tone.
 */

class EcoSphereEngine {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase || (typeof ECO_KNOWLEDGE_BASE !== "undefined" ? ECO_KNOWLEDGE_BASE : null);
    this.conversationHistory = [];
    this.config = {
      engineMode: "offline", // "offline" | "gemini" | "openai"
      geminiApiKey: "",
      openaiApiKey: "",
      geminiModel: "gemini-1.5-flash",
      openaiModel: "gpt-4o-mini",
      toneStyle: "gentle", // "gentle" | "academic" | "concise"
      streamingSpeed: 20 // ms per token
    };

    this.systemPrompt = `You are EcoSphere AI, an exceptionally gentle, compassionate, and scientifically reliable environmental AI assistant.
Your expertise centers on the holistic impacts of synthetic plastics, microplastics, and nanoplastics on:
1. The global environment (marine gyres, freshwater systems, soils, atmosphere, carbon lifecycle).
2. Human health (micro/nanoplastics in blood, organs, placenta, lungs, gut; endocrine disruptors like BPA, phthalates, PFAS; cellular and immune effects).
3. Living organisms and animals (marine life, ingestion, ghost gear, bioaccumulation, trophic transfer, terrestrial fauna, livestock, earthworms).
4. Plants and agriculture (seed germination, root uptake via crack-entry, xylem translocation, photosynthesis suppression, soil symbiosis).
5. Gentle, practical, empowering solutions and sustainable alternatives (PHA, mycelium, circular economy, realistic daily habits).

Key Tone Guidelines:
- Answer with warmth, gentleness, empathy, and reassurance. Never induce eco-anxiety or panic.
- Maintain absolute scientific rigor and accuracy with citations and physiological mechanisms explained cleanly.
- Use markdown formatting with clear headings, bullet points, and gentle concluding reflections.
- Always provide empowering, practical steps the user can take.`;

    this.loadConfig();
  }

  loadConfig() {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("ecosphere_config");
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      }
    } catch (e) {
      console.warn("Could not load config from localStorage", e);
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ecosphere_config", JSON.stringify(this.config));
      }
    } catch (e) {
      console.error("Could not save config", e);
    }
  }

  /**
   * Process a user message and stream back tokens to a callback
   * @param {string} userPrompt 
   * @param {function} onTokenCallback - callback(tokenText, isDone)
   */
  async generateResponse(userPrompt, onTokenCallback) {
    const cleanPrompt = userPrompt.trim();
    if (!cleanPrompt) return;

    // Record user message
    this.conversationHistory.push({ role: "user", content: cleanPrompt, timestamp: Date.now() });

    // Branch based on active engine
    if (this.config.engineMode === "gemini" && this.config.geminiApiKey) {
      try {
        await this.streamGeminiResponse(cleanPrompt, onTokenCallback);
        return;
      } catch (err) {
        console.error("Gemini API error, gently falling back to offline engine:", err);
        onTokenCallback("\n\n> *[Notice: Live Gemini API encountered a network issue. Seamlessly switching to our gentle internal knowledge base]*\n\n", false);
        await this.streamOfflineResponse(cleanPrompt, onTokenCallback);
        return;
      }
    } else if (this.config.engineMode === "openai" && this.config.openaiApiKey) {
      try {
        await this.streamOpenAIResponse(cleanPrompt, onTokenCallback);
        return;
      } catch (err) {
        console.error("OpenAI API error, gently falling back to offline engine:", err);
        onTokenCallback("\n\n> *[Notice: OpenAI API encountered an issue. Seamlessly switching to our gentle internal knowledge base]*\n\n", false);
        await this.streamOfflineResponse(cleanPrompt, onTokenCallback);
        return;
      }
    }

    // Default: Intelligent Specialized Offline Engine
    await this.streamOfflineResponse(cleanPrompt, onTokenCallback);
  }

  /**
   * Match user prompt with internal scientific knowledge base
   */
  synthesizeOfflineResponse(userPrompt) {
    const query = userPrompt.toLowerCase();

    // 1. Check for conversational greetings / identity
    if (query.match(/^(hi|hello|hey|greetings|good\s(morning|afternoon|evening)|howdy)\b/i) && query.length < 25) {
      return {
        text: `Hello and a warm welcome to you! 🌱

I am **EcoSphere AI**, your gentle, scientifically grounded companion dedicated to exploring the relationship between plastics, human well-being, living creatures, and our shared Earth.

Whether you are curious about:
- **Human Health**: Microplastics in our blood, placenta, or how plasticizers (BPA, phthalates) interact with our hormones.
- **Animals & Marine Life**: How sea turtles, whales, seabirds, or garden fauna navigate plastics.
- **Plants & Agriculture**: How nanoplastics enter root systems, xylem vascular pathways, or affect seed germination.
- **The Environment**: Ocean gyres, carbon emissions, and atmospheric microfibers.
- **Gentle Solutions**: Realistic everyday habits, biopolymers, and circular design.

Please feel free to ask any question on your mind, no matter how simple or complex. How may I gently assist you today?`,
        followUps: [
          "How do microplastics enter human blood and organs?",
          "How do plastics affect plant roots and the vegetables we eat?",
          "What happens to marine life like turtles when they encounter plastics?",
          "What are gentle daily habits to reduce plastic in my home?"
        ]
      };
    }

    if (query.match(/(who are you|what can you do|your purpose|what are you)/i)) {
      return {
        text: `I am **EcoSphere AI**—a specialized conversational assistant designed with two core principles: **gentleness of spirit** and **scientific reliability of fact**.

### What I Was Created For:
My purpose is to demystify plastic pollution without fear or alarmism. Plastic is one of the most transformative materials in human history, but understanding its lifecycle—from fossil petroleum extraction to microplastic breakdown inside plant roots and human tissues—allows us to make informed, peaceful choices.

### How I Can Guide You:
1. **Explain Intricate Biology**: From crack-entry root translocation in crops to endocrine signaling interference.
2. **Offer Reassuring Perspective**: Separating sensationalized headlines from peer-reviewed evidence (*Nature*, *Science*, *The Lancet*).
3. **Provide Actionable Hope**: Practical alternatives, biopolymers, home filtration, and supportive community actions.

Feel free to ask a specific question, or explore one of the gentle prompts below!`,
        followUps: [
          "How do nanoplastics enter plant roots and leaves?",
          "What chemical additives like BPA and phthalates do to our body?",
          "What is the Great Pacific Garbage Patch really like?"
        ]
      };
    }

    if (query.match(/(thank you|thanks|appreciate it|grateful)/i) && query.length < 35) {
      return {
        text: `You are so very welcome! It is truly a joy to explore these meaningful topics with someone who cares so deeply about our planet and living beings.

If you ever wish to look deeper into another topic—whether it is botanical health, marine ecosystems, or gentle steps for your home—I am always right here for you. Wishing you a peaceful, green-filled day! 🌿`,
        followUps: [
          "Can you share a gentle eco-friendly tip for today?",
          "How do bioplastics like PHA break down in soil?"
        ]
      };
    }

    // 2. Multi-topic matching & scoring
    const scores = this.kb.topics.map(topic => {
      let score = 0;
      // Keyword matching
      for (const kw of topic.keywords) {
        if (query.includes(kw.toLowerCase())) {
          score += 3;
        }
      }
      // Title matching
      const titleWords = topic.title.toLowerCase().split(/\s+/);
      for (const word of titleWords) {
        if (word.length > 3 && query.includes(word)) {
          score += 2;
        }
      }
      // Category match
      if (query.includes(topic.category.toLowerCase())) {
        score += 2;
      }
      return { topic, score };
    });

    scores.sort((a, b) => b.score - a.score);
    const topMatch = scores[0];

    // If query touches multiple domains (e.g. "humans and plants and animals")
    const matchedTopics = scores.filter(s => s.score >= 3);

    if (matchedTopics.length >= 2 && (query.includes(" and ") || query.includes("all") || query.includes("effects") || query.includes("impact"))) {
      // Synthesize a comprehensive multi-angle response
      return this.synthesizeMultiTopicResponse(query, matchedTopics.slice(0, 3));
    }

    if (topMatch && topMatch.score >= 2) {
      return {
        text: topMatch.topic.gentleExplanation,
        followUps: topMatch.topic.followUps
      };
    }

    // 3. Fallback: Intelligent Deep Dynamic Synthesis
    return this.synthesizeDynamicFallback(query);
  }

  /**
   * Synthesizes multiple topics together smoothly and gently
   */
  synthesizeMultiTopicResponse(query, matches) {
    let combined = `Thank you for asking this expansive and holistic question. The effects of plastic are deeply interconnected across our entire biosphere—linking human wellness, animal life, and botanical vitality. Let us explore these connections gently.

---
`;

    matches.forEach(m => {
      combined += `\n### 🌿 ${m.topic.title} (${m.topic.category})\n`;
      combined += `${m.topic.summary}\n\n`;
      // Extract key scientific facts
      combined += `**Key Scientific Findings:**\n`;
      m.topic.scientificFacts.forEach(fact => {
        combined += `- ${fact}\n`;
      });
      combined += `\n`;
    });

    combined += `---

### A Gentle Integrative Reflection:
Everything in nature is in constant dialogue. When synthetic plastics enter the soil, they touch the roots of plants that nourish us; when they float in rivers and oceans, they touch the aquatic organisms that balance our climate. 

By making gentle adjustments in our daily choices—choosing natural materials, avoiding heating food in plastics, and supporting regenerative agricultural practices—we bring healing to all three realms simultaneously.`;

    const allFollowUps = [];
    matches.forEach(m => {
      if (m.topic.followUps) allFollowUps.push(...m.topic.followUps);
    });

    return {
      text: combined,
      followUps: allFollowUps.slice(0, 4)
    };
  }

  /**
   * Dynamic fallback response for queries that don't match standard keywords exactly
   */
  synthesizeDynamicFallback(query) {
    return {
      text: `Thank you for sharing your question: *"_${query}_"*.

While I explore my scientific library, let us reflect on the core principles of how synthetic plastics interact with biological life:

### 1. The Physical Dimension (Particles & Sizes)
- **Macroplastics** (>5mm): Cause physical entanglements, choking hazards, and intestinal blockages in larger animals (such as seabirds, sea turtles, and cows).
- **Microplastics** (1μm - 5mm): Ingested by zooplankton, marine bivalves, and soil organisms like earthworms; found in commercial table salt and tap water.
- **Nanoplastics** (<1μm): Small enough to cross protective biological barriers, including the intestinal epithelium, vascular tissues, and root epidermis in plants via lateral root fissures.

### 2. The Chemical Dimension (Additives & Adsorbed Toxins)
- Plastics often carry **plasticizers** (like phthalates) and **stabilizers** (like bisphenols and PFAS) that can mimic or interfere with natural hormones.
- In outdoor environments, hydrophobic plastics act like microscopic sponges, concentrating persistent ambient pollutants (like heavy metals and PCBs).

### 3. Gentle Hope & Everyday Action
Whatever specific question you are holding, remember that positive change is always accessible. Simple choices like embracing reusable stainless steel or glass, choosing natural cotton or wool garments, and nurturing rich compost in our gardens make a genuine, measurable difference.

Would you like to explore how this specifically touches **human organs**, **marine creatures**, or **agricultural plant roots**?`,
      followUps: [
        "How do nanoplastics penetrate plant cell walls and roots?",
        "What happens when microplastics circulate in human blood?",
        "How can I reduce plastic use easily in daily life?",
        "What is the difference between PHA and PLA bioplastics?"
      ]
    };
  }

  /**
   * Stream the offline response word-by-word with ChatGPT-like typing cadence
   */
  async streamOfflineResponse(cleanPrompt, onTokenCallback) {
    const result = this.synthesizeOfflineResponse(cleanPrompt);
    const fullText = result.text;
    const words = fullText.split(/(\s+)/); // split preserving spaces

    let accumulated = "";
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i];
      accumulated += chunk;
      onTokenCallback(chunk, false, result.followUps);
      // Small pause for realistic typewriter effect
      const delay = Math.min(this.config.streamingSpeed, 25);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Final callback signal with completed text and followUp recommendations
    onTokenCallback("", true, result.followUps);
    this.conversationHistory.push({ role: "assistant", content: fullText, timestamp: Date.now() });
  }

  /**
   * Stream live response from Google Gemini API
   */
  async streamGeminiResponse(cleanPrompt, onTokenCallback) {
    const apiKey = this.config.geminiApiKey;
    const model = this.config.geminiModel || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    // Build context
    const contents = [
      {
        role: "user",
        parts: [{ text: `${this.systemPrompt}\n\nPlease maintain this gentle, compassionate, and scientifically reliable voice throughout our conversation.` }]
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am EcoSphere AI, your gentle, scientifically rigorous, and compassionate companion for understanding plastics, human health, living organisms, and plant ecosystems." }]
      }
    ];

    // Add recent history (up to last 6 turns)
    const recentHistory = this.conversationHistory.slice(-6);
    recentHistory.forEach(item => {
      contents.push({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      });
    });

    // Add current prompt
    contents.push({
      role: "user",
      parts: [{ text: cleanPrompt }]
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: this.config.toneStyle === "academic" ? 0.3 : 0.6,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.substring(6));
            const candidate = data.candidates?.[0];
            const textPart = candidate?.content?.parts?.[0]?.text;
            if (textPart) {
              accumulatedText += textPart;
              onTokenCallback(textPart, false);
            }
          } catch (e) {
            // Ignore parse errors on partial streams
          }
        }
      }
    }

    onTokenCallback("", true, [
      "Can you explain the molecular mechanism behind that?",
      "How does this connect to plant and soil health?",
      "What gentle steps can someone take to protect themselves?"
    ]);
    this.conversationHistory.push({ role: "assistant", content: accumulatedText, timestamp: Date.now() });
  }

  /**
   * Stream live response from OpenAI API
   */
  async streamOpenAIResponse(cleanPrompt, onTokenCallback) {
    const apiKey = this.config.openaiApiKey;
    const model = this.config.openaiModel || "gpt-4o-mini";
    const url = "https://api.openai.com/v1/chat/completions";

    const messages = [
      { role: "system", content: this.systemPrompt }
    ];

    const recentHistory = this.conversationHistory.slice(-6);
    recentHistory.forEach(item => {
      messages.push({ role: item.role, content: item.content });
    });
    messages.push({ role: "user", content: cleanPrompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.substring(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              accumulatedText += content;
              onTokenCallback(content, false);
            }
          } catch (e) {
            // Ignore parse errors on partial stream chunks
          }
        }
      }
    }

    onTokenCallback("", true, [
      "Could you elaborate gently on the long-term biological effects?",
      "How can we help clean up our local environment?",
      "What are the safest alternatives available today?"
    ]);
    this.conversationHistory.push({ role: "assistant", content: accumulatedText, timestamp: Date.now() });
  }
}

// Export for environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EcoSphereEngine };
}
