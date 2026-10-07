// Extracted from design/index.html by scripts/extract-content.mjs.
// Source of the menu until the admin panel replaces it (Phase 7).
import type { AllergenCode, Category, Localized, MenuItem } from "./types";

export const categories: Category[] = [
  {
    "id": "durums",
    "name": {
      "en": "Dürüms",
      "es": "Dürüms",
      "ca": "Dürüms"
    },
    "icon": "wrap"
  },
  {
    "id": "pizzas",
    "name": {
      "en": "Pizzas",
      "es": "Pizzas",
      "ca": "Pizzes"
    },
    "icon": "pizza"
  },
  {
    "id": "burgers",
    "name": {
      "en": "Burgers",
      "es": "Hamburguesas",
      "ca": "Hamburgueses"
    },
    "icon": "burger"
  },
  {
    "id": "tacos",
    "name": {
      "en": "Fried Tacos",
      "es": "Tacos fritos",
      "ca": "Tacos fregits"
    },
    "icon": "taco",
    "isNew": true
  },
  {
    "id": "drinks",
    "name": {
      "en": "Drinks",
      "es": "Bebidas",
      "ca": "Begudes"
    },
    "icon": "cup"
  },
  {
    "id": "combos",
    "name": {
      "en": "Special Combo Menus",
      "es": "Menús combo especiales",
      "ca": "Menús combo especials"
    },
    "icon": "package"
  }
];

export const items: MenuItem[] = [
  {
    "id": "d1",
    "categoryId": "durums",
    "name": {
      "en": "Gratinated Dürüm",
      "es": "Dürüm gratinado",
      "ca": "Dürüm gratinat"
    },
    "description": {
      "en": "Rolled lavash baked under melted cheese and tomato sauce.",
      "es": "Pan lavash enrollado, gratinado con queso fundido y salsa de tomate.",
      "ca": "Pa lavash enrotllat, gratinat amb formatge fos i salsa de tomàquet."
    },
    "priceCents": 790,
    "image": "durum.jpg",
    "imagePosition": "50% 60%",
    "badge": {
      "en": "Best seller",
      "es": "El más pedido",
      "ca": "El més demanat"
    },
    "allergens": [
      "gluten",
      "dairy"
    ],
    "available": true
  },
  {
    "id": "d2",
    "categoryId": "durums",
    "name": {
      "en": "Chicken Dürüm",
      "es": "Dürüm de pollo",
      "ca": "Dürüm de pollastre"
    },
    "description": {
      "en": "Grilled chicken, lettuce, tomato, onion and yogurt sauce.",
      "es": "Pollo a la brasa, lechuga, tomate, cebolla y salsa de yogur.",
      "ca": "Pollastre a la brasa, enciam, tomàquet, ceba i salsa de iogurt."
    },
    "priceCents": 650,
    "image": "durum-chicken.jpg",
    "imagePosition": "50% 45%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "d3",
    "categoryId": "durums",
    "name": {
      "en": "Veal Dürüm",
      "es": "Dürüm de ternera",
      "ca": "Dürüm de vedella"
    },
    "description": {
      "en": "Grilled veal kebab with fresh salad and garlic sauce.",
      "es": "Kebab de ternera a la brasa con ensalada fresca y salsa de ajo.",
      "ca": "Kebab de vedella a la brasa amb amanida fresca i salsa d’all."
    },
    "priceCents": 690,
    "image": "durum-veal.jpg",
    "imagePosition": "42% 45%",
    "allergens": [
      "gluten",
      "egg"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "d4",
    "categoryId": "durums",
    "name": {
      "en": "Falafel Dürüm",
      "es": "Dürüm de falafel",
      "ca": "Dürüm de falàfel"
    },
    "description": {
      "en": "Homemade chickpea falafel, salad and tahini sauce.",
      "es": "Falafel casero de garbanzo, ensalada y salsa tahini.",
      "ca": "Falàfel casolà de cigró, amanida i salsa tahina."
    },
    "priceCents": 600,
    "image": "durum-falafel.jpg",
    "imagePosition": "55% 45%",
    "allergens": [
      "gluten",
      "sesame"
    ],
    "available": true
  },
  {
    "id": "p1",
    "categoryId": "pizzas",
    "name": {
      "en": "Margherita",
      "es": "Margarita",
      "ca": "Margarida"
    },
    "description": {
      "en": "Tomato sauce, mozzarella, cherry tomatoes and basil.",
      "es": "Salsa de tomate, mozzarella, tomates cherry y albahaca.",
      "ca": "Salsa de tomàquet, mozzarella, tomàquets cherry i alfàbrega."
    },
    "priceCents": 950,
    "image": "pizza.jpg",
    "imagePosition": "50% 70%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "available": true
  },
  {
    "id": "p2",
    "categoryId": "pizzas",
    "name": {
      "en": "Kebab Pizza",
      "es": "Pizza kebab",
      "ca": "Pizza kebab"
    },
    "description": {
      "en": "Tomato, mozzarella, kebab meat, red onion and yogurt sauce.",
      "es": "Tomate, mozzarella, carne de kebab, cebolla morada y salsa de yogur.",
      "ca": "Tomàquet, mozzarella, carn de kebab, ceba morada i salsa de iogurt."
    },
    "priceCents": 1150,
    "image": "pizza-kebab.jpg",
    "imagePosition": "50% 42%",
    "badge": {
      "en": "House pizza",
      "es": "La pizza de la casa",
      "ca": "La pizza de la casa"
    },
    "allergens": [
      "gluten",
      "dairy"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "p3",
    "categoryId": "pizzas",
    "name": {
      "en": "Barbecue Pizza",
      "es": "Pizza barbacoa",
      "ca": "Pizza barbacoa"
    },
    "description": {
      "en": "BBQ sauce, mozzarella, chicken, bacon and onion.",
      "es": "Salsa barbacoa, mozzarella, pollo, bacon y cebolla.",
      "ca": "Salsa barbacoa, mozzarella, pollastre, bacó i ceba."
    },
    "priceCents": 1100,
    "image": "pizza-bbq.jpg",
    "imagePosition": "50% 45%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "available": true
  },
  {
    "id": "p4",
    "categoryId": "pizzas",
    "name": {
      "en": "Four Cheese",
      "es": "Cuatro quesos",
      "ca": "Quatre formatges"
    },
    "description": {
      "en": "Mozzarella, gorgonzola, emmental and parmesan.",
      "es": "Mozzarella, gorgonzola, emmental y parmesano.",
      "ca": "Mozzarella, gorgonzola, emmental i parmesà."
    },
    "priceCents": 1050,
    "image": "pizza-fourcheese.jpg",
    "imagePosition": "50% 45%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "available": true
  },
  {
    "id": "b1",
    "categoryId": "burgers",
    "name": {
      "en": "Classic Cheeseburger",
      "es": "Cheeseburger clásica",
      "ca": "Cheeseburger clàssica"
    },
    "description": {
      "en": "180 g beef, cheddar, tomato, lettuce and pickles on brioche. With fries.",
      "es": "Carne de ternera de 180 g, cheddar fundido, tomate, lechuga y pepinillos en pan brioche. Con patatas.",
      "ca": "Vedella de 180 g, cheddar fos, tomàquet, enciam i cogombrets en pa brioix. Amb patates."
    },
    "priceCents": 890,
    "image": "burger-house.jpg",
    "imagePosition": "30% 55%",
    "allergens": [
      "gluten",
      "dairy",
      "egg"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "b2",
    "categoryId": "burgers",
    "name": {
      "en": "Double Smash Burger",
      "es": "Doble smash burger",
      "ca": "Doble smash burger"
    },
    "description": {
      "en": "Two smashed beef patties, double cheddar, onion and house sauce.",
      "es": "Dos hamburguesas smash de ternera, doble cheddar, cebolla y salsa de la casa.",
      "ca": "Dues hamburgueses smash de vedella, doble cheddar, ceba i salsa de la casa."
    },
    "priceCents": 1090,
    "image": "burger-smash.jpg",
    "imagePosition": "35% 40%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "b3",
    "categoryId": "burgers",
    "name": {
      "en": "Crispy Chicken Burger",
      "es": "Burger de pollo crujiente",
      "ca": "Burger de pollastre cruixent"
    },
    "description": {
      "en": "Crispy fried chicken, lettuce and garlic mayo.",
      "es": "Pollo frito crujiente, lechuga y mayonesa de ajo.",
      "ca": "Pollastre fregit cruixent, enciam i maionesa d’all."
    },
    "priceCents": 850,
    "image": "burger-crispy-chicken.jpg",
    "imagePosition": "42% 45%",
    "allergens": [
      "gluten",
      "egg"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "t1",
    "categoryId": "tacos",
    "name": {
      "en": "Chicken Fried Taco",
      "es": "Taco frito de pollo",
      "ca": "Taco fregit de pollastre"
    },
    "description": {
      "en": "Toasted tortilla filled with chicken, fries and melted cheese sauce.",
      "es": "Tortilla tostada rellena de pollo, patatas fritas y salsa de queso fundido.",
      "ca": "Tortilla torrada farcida de pollastre, patates fregides i salsa de formatge fos."
    },
    "priceCents": 750,
    "image": "tacos2.jpg",
    "imagePosition": "68% 62%",
    "badge": {
      "en": "New",
      "es": "Nuevo",
      "ca": "Nou"
    },
    "allergens": [
      "gluten",
      "dairy"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "t2",
    "categoryId": "tacos",
    "name": {
      "en": "Kebab Fried Taco",
      "es": "Taco frito de kebab",
      "ca": "Taco fregit de kebab"
    },
    "description": {
      "en": "Kebab meat, fries, cheese sauce and your choice of sauce.",
      "es": "Carne de kebab, patatas fritas, salsa de queso y la salsa que prefieras.",
      "ca": "Carn de kebab, patates fregides, salsa de formatge i la salsa que prefereixis."
    },
    "priceCents": 800,
    "image": "tacos3.jpg",
    "imagePosition": "45% 55%",
    "badge": {
      "en": "New",
      "es": "Nuevo",
      "ca": "Nou"
    },
    "allergens": [
      "gluten",
      "dairy"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "t3",
    "categoryId": "tacos",
    "name": {
      "en": "Mixed XL Fried Taco",
      "es": "Taco XL mixto",
      "ca": "Taco XL mixt"
    },
    "description": {
      "en": "Chicken and kebab, double cheese sauce and fries. For big appetites.",
      "es": "Pollo y kebab, doble salsa de queso y patatas fritas. Para los días de mucha hambre.",
      "ca": "Pollastre i kebab, doble salsa de formatge i patates fregides. Per als dies de molta gana."
    },
    "priceCents": 990,
    "image": "tacos1.jpg",
    "imagePosition": "40% 78%",
    "badge": {
      "en": "New",
      "es": "Nuevo",
      "ca": "Nou"
    },
    "allergens": [
      "gluten",
      "dairy"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "k1",
    "categoryId": "drinks",
    "name": {
      "en": "Coca-Cola",
      "es": "Coca-Cola",
      "ca": "Coca-Cola"
    },
    "description": {
      "en": "33 cl can, ice cold.",
      "es": "Lata de 33 cl, bien fría.",
      "ca": "Llauna de 33 cl, ben freda."
    },
    "priceCents": 180,
    "image": "drink-coke.jpg",
    "imagePosition": "50% 40%",
    "allergens": [],
    "available": true
  },
  {
    "id": "k2",
    "categoryId": "drinks",
    "name": {
      "en": "Coca-Cola Zero",
      "es": "Coca-Cola Zero",
      "ca": "Coca-Cola Zero"
    },
    "description": {
      "en": "33 cl can, ice cold.",
      "es": "Lata de 33 cl, bien fría.",
      "ca": "Llauna de 33 cl, ben freda."
    },
    "priceCents": 180,
    "image": "drink-cokezero.jpg",
    "imagePosition": "50% 40%",
    "allergens": [],
    "available": true
  },
  {
    "id": "k3",
    "categoryId": "drinks",
    "name": {
      "en": "Fanta Orange",
      "es": "Fanta naranja",
      "ca": "Fanta taronja"
    },
    "description": {
      "en": "33 cl can, ice cold.",
      "es": "Lata de 33 cl, bien fría.",
      "ca": "Llauna de 33 cl, ben freda."
    },
    "priceCents": 180,
    "image": "drink-fanta.jpg",
    "imagePosition": "50% 45%",
    "allergens": [],
    "available": true
  },
  {
    "id": "k4",
    "categoryId": "drinks",
    "name": {
      "en": "Still Water",
      "es": "Agua mineral",
      "ca": "Aigua mineral"
    },
    "description": {
      "en": "50 cl bottle.",
      "es": "Botella de 50 cl.",
      "ca": "Ampolla de 50 cl."
    },
    "priceCents": 120,
    "image": "drink-water.jpg",
    "imagePosition": "35% 55%",
    "allergens": [],
    "available": true
  },
  {
    "id": "k5",
    "categoryId": "drinks",
    "name": {
      "en": "Ayran",
      "es": "Ayran",
      "ca": "Ayran"
    },
    "description": {
      "en": "Chilled, lightly salted yogurt drink.",
      "es": "Bebida de yogur fresca y ligeramente salada.",
      "ca": "Beguda de iogurt fresca i lleugerament salada."
    },
    "priceCents": 200,
    "image": "drink-ayran.jpg",
    "imagePosition": "50% 45%",
    "allergens": [
      "dairy"
    ],
    "available": true
  },
  {
    "id": "c1",
    "categoryId": "combos",
    "name": {
      "en": "Factory Combo",
      "es": "Combo Factory",
      "ca": "Combo Factory"
    },
    "description": {
      "en": "Burger, fries, 4 chicken nuggets and a drink. For the really hungry days.",
      "es": "Hamburguesa, patatas fritas, 4 nuggets de pollo y una bebida. Para los días de mucha hambre.",
      "ca": "Hamburguesa, patates fregides, 4 nuggets de pollastre i una beguda. Per als dies de molta gana."
    },
    "priceCents": 1290,
    "image": "combo.jpg",
    "imagePosition": "45% 60%",
    "badge": {
      "en": "Most ordered",
      "es": "El más pedido",
      "ca": "El més demanat"
    },
    "allergens": [
      "gluten",
      "dairy",
      "egg"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "c2",
    "categoryId": "combos",
    "name": {
      "en": "Dürüm Menu",
      "es": "Menú dürüm",
      "ca": "Menú dürüm"
    },
    "description": {
      "en": "Any dürüm with fries and a drink.",
      "es": "Cualquier dürüm con patatas fritas y una bebida.",
      "ca": "Qualsevol dürüm amb patates fregides i una beguda."
    },
    "priceCents": 950,
    "image": "durum.jpg",
    "imagePosition": "50% 50%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "available": true
  },
  {
    "id": "c3",
    "categoryId": "combos",
    "name": {
      "en": "Wings Menu",
      "es": "Menú de alitas",
      "ca": "Menú d’ales"
    },
    "description": {
      "en": "8 crispy wings, fries, garlic dip and a drink.",
      "es": "8 alitas crujientes, patatas fritas, salsa de ajo y una bebida.",
      "ca": "8 ales cruixents, patates fregides, salsa d’all i una beguda."
    },
    "priceCents": 1050,
    "image": "wings.jpg",
    "imagePosition": "50% 50%",
    "allergens": [
      "gluten",
      "egg"
    ],
    "halal": true,
    "available": true
  },
  {
    "id": "c4",
    "categoryId": "combos",
    "name": {
      "en": "Family Pizza Menu",
      "es": "Menú pizza familiar",
      "ca": "Menú pizza familiar"
    },
    "description": {
      "en": "2 medium pizzas, 6 wings and a 1.5 L drink.",
      "es": "2 pizzas medianas, 6 alitas y un refresco de 1,5 L.",
      "ca": "2 pizzes mitjanes, 6 ales i un refresc d’1,5 L."
    },
    "priceCents": 2490,
    "image": "pizza.jpg",
    "imagePosition": "50% 40%",
    "allergens": [
      "gluten",
      "dairy"
    ],
    "available": true
  }
];

export const allergens: Record<AllergenCode, Localized> = {
  "gluten": {
    "en": "Gluten",
    "es": "Gluten",
    "ca": "Gluten"
  },
  "dairy": {
    "en": "Dairy",
    "es": "Lácteos",
    "ca": "Làctics"
  },
  "egg": {
    "en": "Egg",
    "es": "Huevo",
    "ca": "Ou"
  },
  "sesame": {
    "en": "Sesame",
    "es": "Sésamo",
    "ca": "Sèsam"
  },
  "soy": {
    "en": "Soy",
    "es": "Soja",
    "ca": "Soja"
  },
  "mustard": {
    "en": "Mustard",
    "es": "Mostaza",
    "ca": "Mostassa"
  },
  "nuts": {
    "en": "Nuts",
    "es": "Frutos secos",
    "ca": "Fruits secs"
  },
  "sulphites": {
    "en": "Sulphites",
    "es": "Sulfitos",
    "ca": "Sulfits"
  },
  "celery": {
    "en": "Celery",
    "es": "Apio",
    "ca": "Api"
  }
};
