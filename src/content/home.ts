// Extracted from design/index.html by scripts/extract-content.mjs.
// Source of the menu until the admin panel replaces it (Phase 7).
import type { FaqEntry, GalleryEntry, HeroSlide, JourneyStop, PopularEntry, Review, TimelineEntry } from "./types";

export const slides: HeroSlide[] = [
  {
    "image": "burger-house.jpg",
    "imagePosition": "30% 50%",
    "itemId": "b2"
  },
  {
    "image": "tacos3.jpg",
    "imagePosition": "45% 40%",
    "itemId": "t2"
  },
  {
    "image": "combo.jpg",
    "imagePosition": "50% 60%",
    "itemId": "c1"
  },
  {
    "image": "tacos2.jpg",
    "imagePosition": "55% 45%",
    "itemId": "t1"
  }
];

export const popular: PopularEntry[] = [
  {
    "itemId": "d1",
    "features": [
      {
        "en": "Charcoal-grilled",
        "es": "A la brasa de carbón",
        "ca": "A la brasa de carbó"
      },
      {
        "en": "Melted cheese topping",
        "es": "Cobertura de queso fundido",
        "ca": "Cobertura de formatge fos"
      }
    ]
  },
  {
    "itemId": "p2",
    "features": [
      {
        "en": "Stone-baked crust",
        "es": "Masa cocida en piedra",
        "ca": "Massa cuita en pedra"
      },
      {
        "en": "House yogurt sauce",
        "es": "Salsa de yogur de la casa",
        "ca": "Salsa de iogurt de la casa"
      }
    ]
  },
  {
    "itemId": "b2",
    "features": [
      {
        "en": "Double smashed patties",
        "es": "Doble carne smash",
        "ca": "Doble carn smash"
      },
      {
        "en": "House sauce",
        "es": "Salsa de la casa",
        "ca": "Salsa de la casa"
      }
    ]
  },
  {
    "itemId": "t2",
    "features": [
      {
        "en": "Crispy fried shell",
        "es": "Tortilla frita crujiente",
        "ca": "Tortilla fregida cruixent"
      },
      {
        "en": "Melted cheese sauce",
        "es": "Salsa de queso fundido",
        "ca": "Salsa de formatge fos"
      }
    ]
  },
  {
    "itemId": "p1",
    "features": [
      {
        "en": "Fresh basil & mozzarella",
        "es": "Albahaca fresca y mozzarella",
        "ca": "Alfàbrega fresca i mozzarella"
      },
      {
        "en": "Wood-fired crust",
        "es": "Masa al horno de leña",
        "ca": "Massa al forn de llenya"
      }
    ]
  },
  {
    "itemId": "c1",
    "features": [
      {
        "en": "4 chicken nuggets",
        "es": "4 nuggets de pollo",
        "ca": "4 nuggets de pollastre"
      },
      {
        "en": "Fries + drink included",
        "es": "Patatas y bebida incluidas",
        "ca": "Patates i beguda incloses"
      }
    ]
  }
];

export const reviews: Review[] = [
  {
    "name": "Marc Puig",
    "stars": 5,
    "text": "El dürüm gratinat és espectacular. Ha arribat calent i en menys de 45 minuts.",
    "itemId": "d1",
    "photo": "reviewer-marc.jpg"
  },
  {
    "name": "Sara López",
    "stars": 5,
    "text": "Muy buena cantidad y bien de precio. La pizza kebab está buenísima.",
    "itemId": "p2",
    "photo": "reviewer-sara.jpg"
  },
  {
    "name": "Laura Fernández",
    "stars": 5,
    "text": "La doble smash burger está buenísima, se nota que la carne es de calidad. ¡Volveremos pronto!",
    "itemId": "b2",
    "photo": "reviewer-laura.jpg"
  }
];

export const journey: JourneyStop[] = [
  {
    "x": 75,
    "y": 10,
    "side": "r",
    "icon": "store",
    "image": "durum.jpg",
    "timelineIndex": 0
  },
  {
    "x": 25,
    "y": 38,
    "side": "l",
    "icon": "bike",
    "image": "combo.jpg",
    "timelineIndex": 1
  },
  {
    "x": 75,
    "y": 68,
    "side": "r",
    "icon": "starf",
    "image": "wings.jpg",
    "timelineIndex": 2
  },
  {
    "x": 50,
    "y": 100,
    "side": "c",
    "icon": "flame",
    "image": "tacos2.jpg",
    "timelineIndex": 3
  }
];

export const timeline: TimelineEntry[] = [
  {
    "year": {
      "en": "2019",
      "es": "2019",
      "ca": "2019"
    },
    "title": {
      "en": "We opened our doors",
      "es": "Abrimos las puertas",
      "ca": "Obrim les portes"
    },
    "text": {
      "en": "A small spot in Badalona with a wood oven and a lot of heart.",
      "es": "Un pequeño local en Badalona con un horno de leña y mucha ilusión.",
      "ca": "Un petit local a Badalona amb un forn de llenya i molta il·lusió."
    },
    "icon": "store"
  },
  {
    "year": {
      "en": "2021",
      "es": "2021",
      "ca": "2021"
    },
    "title": {
      "en": "We started delivering",
      "es": "Empezamos a repartir",
      "ca": "Comencem a repartir"
    },
    "text": {
      "en": "All of Badalona started ordering without leaving home.",
      "es": "Badalona entera empezó a pedir sin salir de casa.",
      "ca": "Tota Badalona va començar a demanar sense sortir de casa."
    },
    "icon": "bike"
  },
  {
    "year": {
      "en": "2023",
      "es": "2023",
      "ca": "2023"
    },
    "title": {
      "en": "1,000 five-star reviews",
      "es": "Más de 1.000 reseñas de 5 estrellas",
      "ca": "Més de 1.000 ressenyes de 5 estrelles"
    },
    "text": {
      "en": "Thanks to you, more arrive every week.",
      "es": "Gracias a vosotros, cada semana llegan más.",
      "ca": "Gràcies a vosaltres, cada setmana n’arriben més."
    },
    "icon": "starf"
  },
  {
    "year": {
      "en": "Today",
      "es": "Hoy",
      "ca": "Avui"
    },
    "title": {
      "en": "Still at the grill",
      "es": "Seguimos a la brasa",
      "ca": "Seguim a la brasa"
    },
    "text": {
      "en": "Same neighborhood, same oven, the same passion as always.",
      "es": "Mismo barrio, mismo horno, la misma pasión de siempre.",
      "ca": "Mateix barri, mateix forn, la mateixa passió de sempre."
    },
    "icon": "flame"
  }
];

export const gallery: GalleryEntry[] = [
  {
    "image": "durum.jpg",
    "itemId": "d1"
  },
  {
    "image": "pizza.jpg",
    "itemId": "p1"
  },
  {
    "image": "burger-house.jpg",
    "itemId": "b2"
  },
  {
    "image": "tacos1.jpg",
    "itemId": "t1"
  },
  {
    "image": "combo.jpg",
    "itemId": "c1"
  },
  {
    "image": "wings.jpg",
    "itemId": "c3"
  },
  {
    "image": "salad.png",
    "name": {
      "en": "Fresh salad",
      "es": "Ensalada fresca",
      "ca": "Amanida fresca"
    }
  },
  {
    "image": "plates.png",
    "name": {
      "en": "Our dishes",
      "es": "Nuestros platos",
      "ca": "Els nostres plats"
    }
  }
];

export const faq: FaqEntry[] = [
  {
    "question": {
      "en": "How far do you deliver?",
      "es": "¿Hasta dónde entregáis?",
      "ca": "Fins on lliureu?"
    },
    "answer": {
      "en": "We deliver within a 5 km radius of Badalona. Enter your address when ordering and we’ll confirm we can reach you.",
      "es": "Entregamos en un radio de 5 km desde Badalona. Introduce tu dirección al pedir y te confirmaremos si llegamos.",
      "ca": "Lliurem en un radi de 5 km des de Badalona. Introdueix la teva adreça en fer la comanda i et confirmarem si hi arribem."
    }
  },
  {
    "question": {
      "en": "How can I pay?",
      "es": "¿Cómo puedo pagar?",
      "ca": "Com puc pagar?"
    },
    "answer": {
      "en": "Cash or card to the rider, no need to pay online or create an account.",
      "es": "Efectivo o tarjeta al repartidor, sin necesidad de pagar online ni crear una cuenta.",
      "ca": "Efectiu o targeta al repartidor, sense necessitat de pagar en línia ni crear un compte."
    }
  },
  {
    "question": {
      "en": "Do you have allergen information?",
      "es": "¿Tenéis información sobre alérgenos?",
      "ca": "Teniu informació sobre al·lèrgens?"
    },
    "answer": {
      "en": "Yes, every dish shows its main allergens. If you have an allergy or intolerance, let us know when ordering and our team will confirm it for you.",
      "es": "Sí, cada plato indica los alérgenos principales que contiene. Si tienes una alergia o intolerancia, dínoslo al hacer el pedido y nuestro equipo te lo confirmará.",
      "ca": "Sí, cada plat indica els al·lèrgens principals que conté. Si tens una al·lèrgia o intolerància, digues-ho en fer la comanda i el nostre equip t’ho confirmarà."
    }
  },
  {
    "question": {
      "en": "Which dishes are Halal?",
      "es": "¿Qué platos son Halal?",
      "ca": "Quins plats són Halal?"
    },
    "answer": {
      "en": "Dishes marked with the Halal tag are made with Halal-certified meat, certified by [certifying body — pending confirmation]. A few dishes, such as our Barbecue Pizza, contain bacon and are not Halal — please check the tag on each dish or ask our team if you’re unsure.",
      "es": "Los platos marcados con la etiqueta Halal están elaborados con carne certificada Halal, certificada por [entidad certificadora — pendiente de confirmar]. Algunos platos, como nuestra Pizza Barbacoa, llevan bacon y no son Halal — revisa la etiqueta de cada plato o pregunta a nuestro equipo si tienes dudas.",
      "ca": "Els plats marcats amb l’etiqueta Halal estan elaborats amb carn certificada Halal, certificada per [entitat certificadora — pendent de confirmar]. Alguns plats, com la nostra Pizza Barbacoa, porten bacó i no són Halal — revisa l’etiqueta de cada plat o pregunta al nostre equip si tens dubtes."
    }
  },
  {
    "question": {
      "en": "Is there a minimum order?",
      "es": "¿Hay pedido mínimo?",
      "ca": "Hi ha comanda mínima?"
    },
    "answer": {
      "en": "No, order whatever you like, with no minimum spend.",
      "es": "No, puedes pedir lo que te apetezca, sin mínimo de compra.",
      "ca": "No, pots demanar el que et vingui de gust, sense mínim de compra."
    }
  },
  {
    "question": {
      "en": "How long does delivery take?",
      "es": "¿Cuánto tarda la entrega?",
      "ca": "Quant triga el lliurament?"
    },
    "answer": {
      "en": "About 45 minutes on average from when we confirm your order, depending on the area and time of day.",
      "es": "Sobre 45 minutos de media desde que confirmamos tu pedido, según la zona y el momento del día.",
      "ca": "Al voltant de 45 minuts de mitjana des que confirmem la teva comanda, segons la zona i el moment del dia."
    }
  },
  {
    "question": {
      "en": "Can I pick up my order myself?",
      "es": "¿Puedo recoger el pedido yo mismo?",
      "ca": "Puc recollir la comanda jo mateix?"
    },
    "answer": {
      "en": "Of course, just let us know when ordering and we’ll have it ready at the time you choose.",
      "es": "Claro, indícalo al hacer el pedido y lo tendremos listo en el horario que elijas.",
      "ca": "És clar, indica-ho en fer la comanda i el tindrem a punt a l’hora que triïs."
    }
  }
];
