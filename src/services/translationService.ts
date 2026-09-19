/**
 * Private Translation Service (Client-Side Simulation)
 * Provides private, end-to-end simulated translation between English, French, Spanish, etc.
 * Keeps messages strictly local without sending sensitive relationship chats to third-party endpoints.
 */

const KNOWN_TRANSLATIONS: Record<string, Record<string, string>> = {
  // English to French
  fr: {
    'Missing you across the ocean! Sent you a sunset photo.':
      'Tu me manques de l’autre côté de l’océan ! Je t’ai envoyé une photo de coucher de soleil.',
    'Hey Alex! Yes, love seeing the distance tracker and knowing we are connected ❤️':
      'Salut Alex ! Oui, j’adore regarder le tracker de distance et savoir qu’on est connectés ❤️',
    'Hey Maya! It feels so good to have our private corner while we are in different cities.':
      'Salut Maya ! C’est tellement bon d’avoir notre coin privé alors qu’on est dans des villes différentes.',
    'Looking forward to catching up this weekend!':
      'Hâte de rattraper le temps perdu ce week-end !',
    'Welcome everyone to "Our Inner Circle"! This is our shared group preview.':
      'Bienvenue à tous dans « Notre Cercle Privé » ! Voici notre aperçu de groupe partagé.',
    'I love you and I can’t wait to hold your hand again soon.':
      'Je t’aime et j’ai hâte de te tenir la main très bientôt.',
    'Good morning beautiful! How did you sleep?':
      'Bonjour mon cœur ! Comment as-tu dormi ?',
  },
  // French to English
  en: {
    'Tu me manques tellement mon amour !': 'I miss you so much my love!',
    'J’ai hâte qu’on se retrouve à Paris.': 'I can’t wait for us to be together in Paris.',
    'Bonjour mon amour, passe une merveilleuse journée !':
      'Good morning my love, have a wonderful day!',
    'Regarde ce magnifique coucher de soleil': 'Look at this gorgeous sunset',
  },
  // English to Spanish
  es: {
    'Missing you across the ocean! Sent you a sunset photo.':
      '¡Te extraño al otro lado del océano! Te envié una foto del atardecer.',
    'Looking forward to catching up this weekend!':
      '¡Con ganas de ponernos al día este fin de semana!',
    'Good morning beautiful! How did you sleep?':
      '¡Buenos días hermosa! ¿Cómo dormiste?',
  },
};

export const TranslationService = {
  translate: async (
    text: string,
    targetLang: 'en' | 'fr' | 'es' = 'fr'
  ): Promise<{ translatedText: string; detectedSourceLang: string }> => {
    // Simulate brief processing delay for realistic UX
    await new Promise((res) => setTimeout(res, 150));

    const trimmed = text.trim();
    if (KNOWN_TRANSLATIONS[targetLang] && KNOWN_TRANSLATIONS[targetLang][trimmed]) {
      return {
        translatedText: KNOWN_TRANSLATIONS[targetLang][trimmed],
        detectedSourceLang: targetLang === 'en' ? 'French' : 'English',
      };
    }

    // Heuristic prefix translation simulation for arbitrary messages
    if (targetLang === 'fr') {
      return {
        translatedText: `[FR] « ${trimmed} » (Traduit en français)`,
        detectedSourceLang: 'English',
      };
    } else if (targetLang === 'es') {
      return {
        translatedText: `[ES] « ${trimmed} » (Traducido al español)`,
        detectedSourceLang: 'English',
      };
    }

    return {
      translatedText: `[EN] "${trimmed}" (Translated to English)`,
      detectedSourceLang: 'French',
    };
  },
};
