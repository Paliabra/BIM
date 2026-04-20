
# Du BIM — De l'exploitation du modèle numérique
## De la planche à l'écran
Je ne saurais dire depuis quand l'homme dessine mais je pense que le dessin est né du besoin de communiquer, du besoin de mieux se faire comprendre. L'ingénierie s'est bâtie autour du dessin. Transformant ce moyen d’expression en un langage structuré pour mieux concevoir et réaliser avec précision.

Le dessin technique est un langage en lui-même, qui s'affranchit de la barrière linguistique.

La naissance de l'informatique a marqué un tournant majeur dans le dessin avec l’avènement de la CAO. Au départ, l'ordinateur n'était qu'une planche à dessin électronique. Avant de passer de l’aide au dessin à l’aide à la conception grâce à la programmation orientée objet. Avec elle, l’ordinateur ne voyait plus seulement des vecteurs (traits, arcs, cercles) ; il commençait à comprendre les objets métier (murs, dalles, fenêtres).

## De la dérive
Cette compréhension des objets s'est accompagnée de son corollaire nécessaire dans la définition des attributs : alors qu’un trait a des attributs du type épaisseur ou couleur, une porte elle a des attributs du type, sens d’ouverture, matériau… Paramètres pour les uns, propriétés pour les autres, ces données sont devenues une valeur ajoutée au dessin. Cette avancée a été d'une force si considérable que, bientôt, on parla de BIM pour marquer le changement avec la CAO. Le BIM permettait d'associer de la donnée non graphique au dessin, au point de presque prendre le dessus sur le dessin, sur la donnée géométrique.

Le format IFC en rendant les attributs facilement exploitables a peut-être malgré lui aidé à cette dérive. La maquette numérique est considérée comme de la géométrie enrichie, mais exploitée dans une logique de données alphanumériques. La maquette numérique est devenue un conteneur de données.

Cette lecture est la cause majeure des difficultés que nous rencontrons dans l’exploitation des maquettes numériques.

Nous entendons, répétons et soutenons que pour exploiter la maquette numérique il faut qu'elle soit propre. Entendant par propre bien structurée, bien nommée, bien paramétrée, etc... Base de travail sine qua non pour mener nos analyses.

## La géométrie reléguée au second plan
Mais quid de la structure géométrique? Du dessin?

Dans cette logique, la géométrie est exploitée en tant que support de données. Elle n'est pas, ou très rarement, considérée comme la base première, la structure de la maquette numérique. Pourtant, l'agencement des murs, des sols, des toits, des fenêtres et des portes de sorte qu'on comprenne un projet est la structure maîtresse. Une structure robuste, sur laquelle l'architecte, l'ingénieur, chaque acteur du dessin s'applique. Tant d'efforts relégués au rang de portage de données.

La maquette numérique, par sa structure orientée objets métier, est un modèle spatial puissant. Nous avons pourtant érigé la structuration des données alphanumériques en préalable au contrôle du projet.

Nous vérifions que les objets sont modélisés dans la bonne classe, qu'ils sont correctement nommés, rattachés au bon niveau. L'analogie en CAO serait : vérifier qu'un trait est au bon calque, à la bonne épaisseur, au bon type de ligne.

Un architecte qui livre sa maquette, fruit de nombreuses heures de conception et un grand soin de dessin. Pour analyser le projet, nous commençons par vérifier que les objets sont dans la bonne classe, que les niveaux sont bien renseignés… Si notre objectif est de savoir combien il y a de logements, de quels types, et que l'architecte n'a pas renseigné la typologie dans un attribut que je connais, cette opération devient difficile voire impossible par requête informatique. Pourtant la base pour le faire est présente : le dessin.

Le problème est notre logique d'exploitation des maquettes numériques. Nous exploitons les contraintes et relations entre objets dans une logique d’attribut. Nous considérons la géométrie comme simple porteuse d'informations. Avec pour conséquence de n'avoir presque pas d'outil permettant de l'exploiter autrement.

Un logement, tel que nous le construisons, est un volume fermé ayant au moins une sortie. Toutes les distributions internes à ce volume sont des agencements de pièces. Avec les pièces modélisées, je devrais pouvoir faire ma requête sans peine. Et avec un peu plus d'effort de caractérisation, identifier les pièces même si elles sont manquantes : les murs, sols, fenêtres et portes existants y suffisent.

Nous devons voir et exploiter la maquette numérique comme on exploite un modèle SIG, dans une logique géométrie first. C'est à ce prix, ce changement de paradigme, que nous pourrons nous affranchir des difficultés que nous connaissons et vraiment faire un bond dans cette ère de transformation digitale.

## Le mot de clôture
J'ai entrepris de travailler sur ce projet de changement de paradigme. Nous devons arrêter d’exploiter la maquette comme un Excel avec une visionneuse 3D. Si vous êtes ambitieux, passionné du mieux faire, motivé à changer les choses en bien, le raisonnement spatial et la topologie vous intéressent, vous êtes as du code, ouvert d'esprit et non réfractaire au changement, rendez-vous ici : github. Apportons notre pierre à l’édifice.


#BIM #openBIM #SIG #TransformationNumérique #PropertySets #ComputationalDesign #AIinAECO
