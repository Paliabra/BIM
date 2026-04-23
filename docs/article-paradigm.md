# BIM — Exploiting the Digital Model
## From Drawing Board to Screen
I could not say when humans first began to draw, but I believe drawing was born from the need to communicate — the need to be better understood. Engineering was built around drawing. It transformed this means of expression into a structured language for better design and precise execution.

Technical drawing is a language in itself — one that transcends the linguistic barrier.

The birth of computing marked a major turning point in drawing, with the advent of CAD. At first, the computer was nothing more than an electronic drawing board. It then progressed from drawing aid to design aid, thanks to object-oriented programming. With it, the computer no longer saw only vectors (lines, arcs, circles); it began to understand trade objects (walls, slabs, windows).

## The Drift
This understanding of objects came with its necessary corollary: the definition of attributes. Whereas a line has attributes such as thickness or colour, a door has attributes such as opening direction, material, and so on. Parameters for some, properties for others, this data became an added value to the drawing. This advance was so powerful that, before long, we spoke of BIM to mark the shift from CAD. BIM allowed non-graphical data to be associated with the drawing — to the point of almost overtaking it, overtaking the geometric data.

The IFC format, by making attributes easily exploitable, may have inadvertently contributed to this drift. The digital model is considered as enriched geometry, but exploited through the logic of alphanumeric data. The digital model has become a data container.

This reading is the primary cause of the difficulties we encounter in exploiting digital models.

We hear, repeat, and assert that to exploit a digital model it must be clean — meaning well-structured, well-named, well-parameterised, and so on. A sine qua non foundation for any analysis.

## Geometry Relegated to the Background
But what of the geometric structure? Of the drawing?

Within this logic, geometry is exploited as a data carrier. It is not — or very rarely — considered as the primary foundation, the structure of the digital model. Yet the arrangement of walls, floors, roofs, windows, and doors in a way that makes a project comprehensible is the master structure. A robust structure, upon which the architect, the engineer, every participant in the drawing applies careful effort. So much effort, relegated to the role of data carrier.

The digital model, through its trade-object-oriented structure, is a powerful spatial model. Yet we have elevated the structuring of alphanumeric data to a prerequisite for project verification.

We check that objects are modelled in the right class, correctly named, attached to the right level. The CAD analogy would be: checking that a line is on the right layer, at the right thickness, in the right line type.

An architect delivers their model — the product of many hours of design work and great care in drawing. To analyse the project, we begin by checking that objects are in the right class, that levels are properly filled in… If our objective is to know how many dwellings there are, of what types, and the architect has not entered the typology in an attribute we know, this operation becomes difficult or even impossible through computational query. Yet the foundation to do so is right there: the drawing.

The problem is our logic for exploiting digital models. We exploit the constraints and relationships between objects through an attribute logic. We treat geometry as a mere carrier of information. With the consequence that we have almost no tools capable of exploiting it any other way.

A dwelling, as we build it, is a closed volume with at least one exit. All internal distributions within that volume are room arrangements. With the rooms modelled, I should be able to run my query with ease. And with a little more characterisation effort, identify rooms even when they are absent: the existing walls, floors, windows, and doors are sufficient for this.

We must see and exploit the digital model as we exploit a GIS model — in a geometry-first logic. It is at this price, this paradigm shift, that we will be able to shed the difficulties we know and truly make a leap in this era of digital transformation.

## Closing Note
I have undertaken to work on this paradigm-shift project. We must stop exploiting the model like an Excel spreadsheet with a 3D viewer. If you are ambitious, passionate about doing things better, motivated to change things for good, interested in spatial reasoning and topology, a sharp coder, open-minded and ready for change — meet us here: github. Let us each bring our contribution.


#BIM #openBIM #GIS #DigitalTransformation #PropertySets #ComputationalDesign #AIinAECO
