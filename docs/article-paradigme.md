# Du trait à la maquette comprise
### Une rupture nécessaire dans l'exploitation de la maquette numérique

---

Je ne saurais dire depuis quand l'homme dessine. Mais je pense que le dessin est né avec le besoin de communiquer. Le besoin de mieux se comprendre.

L'ingénierie s'est bâtie autour du dessin — là où le besoin de se comprendre est devenu celui de mieux concevoir. Le dessin technique, comme moyen d'expression, un langage structuré, permettant aux hommes de coucher à l'ancre le fruit de leurs imaginations. De les réaliser avec précision.

Ce langage traverse les millénaires. Les ostraca égyptiens du chantier de Deir el-Médineh — ces fragments de calcaire sur lesquels les scribes de pharaon croquaient les proportions des temples à construire. Les carnets de Villard de Honnecourt au XIIIe siècle, où l'architecte des cathédrales gothiques transmettait le savoir de taille de pierre par le dessin seul. Les planches de Léonard de Vinci, où la mécanique, l'anatomie et l'architecture coexistaient dans le même langage graphique. Des hommes de langues différentes, de cultures différentes, qui se comprenaient par la forme avant de se comprendre par les mots.

Le dessin technique est un langage en lui-même. Il s'affranchit de la barrière linguistique.

---

## De la planche à l'écran

La naissance de l'informatique a marqué un tournant majeur dans le dessin. L'homme a naturellement porté son imagination pour que l'ordinateur l'aide dans sa conception — au-delà de l'acte simple du trait.

La CAO est ainsi née. L'ordinateur a d'abord été une aide au dessin. Avec lui, le dessin est devenu facilement éditable, facilement réplicable. Puis une aide à la conception dans les domaines de calcul — passant d'un dessin en 2D à la possibilité d'obtenir simultanément la 3D et la 2D, jusqu'à comprendre les objets du métier.

---

## Le début de la dérive

La compréhension des objets s'est accompagnée de son corollaire nécessaire : les attributs. Paramètres pour les uns, propriétés pour les autres. Accessibles à l'utilisateur final, cette avancée a été d'une force considérable. On parla bientôt de BIM pour marquer le changement du CAD. Le BIM permettait d'associer de la donnée non graphique au dessin. Au point, presque, de prendre le dessus sur lui. Sur la donnée graphique.

Le format IFC, en rendant les attributs facilement exploitables, a peut-être malgré lui alimenté cette dérive. La maquette numérique est vue comme de la géométrie enrichie — mais exploitée en données alphanumériques. La géométrie est restée. Son rôle a changé.

La maquette numérique est devenue un conteneur de données.

Cette lecture est la cause majeure des difficultés que nous rencontrons dans son exploitation. Nous entendons, répétons et soutenons que pour exploiter la maquette numérique, il faut qu'elle soit propre. Bien structurée, bien nommée, bien paramétrée. Prérequis sine qua non de toute analyse.

---

## La géométrie reléguée au second plan

Mais quid de la géométrie ? Du dessin ?

La géométrie est exploitée dans la logique objet pour être conteneur d'informations. Elle n'est pas — ou très rarement — considérée comme la base première de la structure. Avoir les murs, sols, toits, fenêtres et portes agencés de sorte à ce que l'on comprenne le projet : c'est pourtant la structure maîtresse.

Cette structure est robuste. L'architecte, l'ingénieur, chaque acteur du dessin s'y applique avec soin. Tant d'efforts, pour finir relégués au rang de simple porteur de données.

---

## Du contrôle des projets

Imaginez un architecte qui livre sa maquette. Des centaines d'heures de conception. Les murs, les sols, les toits, les fenêtres, les portes. Le bâtiment existe, précis, dans l'espace numérique.

Le contrôleur l'ouvre. Et commence par vérifier que les murs sont dans la bonne classe, que les objets sont correctement nommés, que les niveaux sont bien renseignés.

C'est l'équivalent BIM de vérifier qu'un trait est au bon calque dans un fichier DWG. Pertinent pour la gestion documentaire. À côté du sujet pour la vérification du projet.

La maquette numérique est avant tout un modèle spatial. Chaque objet existe à une position précise, définie par sa géométrie. Cette position est incorruptible — on peut mal nommer un mur, mal le classer, oublier ses propriétés. Sa géométrie, elle, reste là. Elle dit où il commence, où il finit, à quelle hauteur, contre quoi il s'appuie.

La géométrie ne ment pas.

Pourtant, nous avons érigé la structuration des données alphanumériques en prérequis au contrôle du projet. Avec pour conséquence de n'avoir presque aucun outil qui exploite vraiment ce que la géométrie contient.

Prenons la question la plus basique d'un programme résidentiel : combien de logements, et de quels types ?

Si l'architecte n'a pas renseigné la typologie dans le bon attribut, avec la bonne valeur, dans le bon PSet, selon la bonne convention — je cherche dans le vide. Alors que la réponse est dans le dessin depuis le début.

Un logement, tel que nous le construisons, est un volume fermé ayant au moins une entrée. Tout le reste est dans l'agencement spatial de ce volume. Une chambre a une certaine surface, une fenêtre, une porte. Un séjour a d'autres dimensions. Une cuisine se reconnaît à ses équipements et à sa position dans le plan.

Avec les murs modélisés, les portes et les fenêtres, je peux déduire les logements. Avec les logements, caractériser leur composition. Avec leur composition, identifier la typologie — T2, T3, T4 — sans qu'un seul attribut ait été renseigné.

Le dessin suffit. Il a toujours suffi.

C'est nous qui avons cessé de l'interroger.

Et même au-delà. Si certaines pièces sont absentes du modèle, la géométrie des murs, sols, fenêtres et portes existants devrait suffire à les inférer. La structure est là. Il faut vouloir la lire.

Ce raisonnement, fastidieux à mener manuellement, est atteignable par algorithme. Il est encore plus naturel par l'intelligence artificielle. Et si l'IA a besoin de données propres, la maquette numérique — avec sa géométrie précise, ses objets positionnés, ses relations spatiales — est la donnée d'or à lui fournir. À condition de la regarder pour ce qu'elle est vraiment : un modèle spatial, pas un tableur en trois dimensions.

C'est à ce prix de changement de regard que nous pourrons nous départir des difficultés que nous connaissons — et véritablement faire un bond dans cette ère de transformation digitale.

---

## La suite logique

Ce changement de regard a des conséquences immédiates, concrètes, vérifiables.

Un équipement technique dont la référence est inscrite dans le modèle peut être confronté à la fiche technique du fabricant. Sa géométrie dit s'il est à la bonne échelle, s'il tient dans son local, s'il ne rentre pas en collision avec la structure. Aucun attribut requis.

Un WC peut être identifié comme tel par sa forme et ses équipements — indépendamment de son étiquette IFC. Sa porte peut être vérifiée. Son lave-mains. La nature du local voisin. Tout cela est dans la géométrie.

Un équipement sanitaire dont le bas du maillage est à 1,40 mètre de l'évacuation la plus proche — quand les règles de raccordement exigent moins de 150 mm — est une anomalie invisible sur un plan 2D. Elle est flagrante dans l'analyse spatiale.

Ces vérifications ne nécessitent pas un modèle parfaitement renseigné. Elles nécessitent un modèle correctement dessiné. Et ça, les équipes le font déjà. Depuis toujours.

---

## Le mot de clôture

Les LLM et le MCP vont profondément changer nos métiers. De puissants outils de conception vont naître — et peut-être même en open source.

Intervenant du côté de la maîtrise d'ouvrage et faisant face à ces difficultés, j'ai entrepris de travailler sur ce projet de changement de paradigme. Son bénéfice ne se limite pas au maître d'ouvrage.

Si vous êtes ambitieux, passionné du mieux faire, motivé à changer les choses en bien — as de code, ouvert d'esprit, non réfractaire au changement.

Rendez-vous ici : [github.com/paliabra/bim](https://github.com/paliabra/bim)
