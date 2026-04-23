# From Drawing to Understood Model
### A necessary paradigm shift in how we exploit digital building models

---

I could not say when humans first began to draw. But I believe drawing was born from the need to communicate. The need to better understand one another.

Engineering was built around drawing — the point at which the need to understand each other became the need to better design. Technical drawing, as a form of expression, is a structured language, allowing people to anchor the fruits of their imagination. To realise them with precision.

This language spans millennia. The Egyptian ostraca from the Deir el-Medina worksite — those limestone fragments on which the pharaoh's scribes sketched the proportions of temples to be built. The notebooks of Villard de Honnecourt in the 13th century, where the architect of Gothic cathedrals transmitted the knowledge of stone-cutting through drawing alone. The plates of Leonardo da Vinci, where mechanics, anatomy, and architecture coexisted in the same graphic language. Men of different tongues, different cultures, who understood each other through form before they understood each other through words.

Technical drawing is a language in itself. It transcends the linguistic barrier.

---

## From the Drawing Board to the Screen

The birth of computing marked a major turning point in drawing. Humans naturally channelled their imagination into making the computer a design aid — beyond the simple act of the line.

CAD was born from this. The computer was first an aid to drawing. With it, drawing became easily editable, easily replicable. Then an aid to design in engineering domains — moving from 2D drawing to the simultaneous production of 3D and 2D, until the objects of the trade were truly understood.

---

## The Beginning of the Drift

The understanding of objects came with its necessary corollary: attributes. Parameters for some, properties for others. Made accessible to the end user, this advance was of considerable power. People soon spoke of BIM to mark the change from CAD. BIM allowed non-graphical data to be associated with the drawing. To the point, almost, of overtaking it. Overtaking the graphical data.

The IFC format, by making attributes easily exploitable, may have inadvertently fed this drift. The digital model is seen as enriched geometry — but exploited as alphanumeric data. The geometry remained. Its role changed.

The digital model became a data container.

This reading is the primary cause of the difficulties we encounter in exploiting it. We hear, repeat, and assert that to exploit the digital model, it must be clean. Well-structured, well-named, well-parameterised. A sine qua non prerequisite to any analysis.

---

## Geometry Relegated to the Background

But what of geometry? Of the drawing?

Geometry is exploited within the object logic to serve as a container for information. It is not — or very rarely — considered as the primary foundation of the structure. Having walls, floors, roofs, windows, and doors arranged so that the project is understood: that is the master structure.

This structure is robust. The architect, the engineer, every participant in the drawing applies themselves to it with care. So much effort, only to end up relegated to the role of mere data carrier.

---

## On Project Verification

Imagine an architect delivering their model. Hundreds of hours of design work. The walls, floors, roofs, windows, doors. The building exists, precise, in digital space.

The verifier opens it. And begins by checking that the walls are in the right class, that the objects are correctly named, that the levels are properly filled in.

This is the BIM equivalent of checking that a line is on the right layer in a DWG file. Relevant for document management. Beside the point for project verification.

The digital model is above all a spatial model. Each object exists at a precise position, defined by its geometry. This position is incorruptible — a wall can be badly named, badly classified, missing its properties. Its geometry remains. It tells you where it starts, where it ends, at what height, against what it rests.

Geometry does not lie.

Yet we have elevated the structuring of alphanumeric data to a prerequisite for project verification. With the consequence that we have almost no tools that truly exploit what geometry contains.

Take the most basic question from a residential programme: how many dwellings, and of what types?

If the architect has not entered the typology in the right attribute, with the right value, in the right PSet, according to the right convention — I search in vain. Yet the answer has been in the drawing all along.

A dwelling, as we build it, is a closed volume with at least one entrance. Everything else is in the spatial arrangement of that volume. A bedroom has a certain area, a window, a door. A living room has different dimensions. A kitchen is recognisable by its equipment and its position in the plan.

With the walls modelled, the doors and the windows, I can deduce the dwellings. With the dwellings, characterise their composition. With their composition, identify the typology — studio, one-bedroom, two-bedroom — without a single attribute having been filled in.

The drawing is sufficient. It always has been.

It is we who stopped interrogating it.

And beyond that. If some rooms are absent from the model, the geometry of the existing walls, floors, windows, and doors should be enough to infer them. The structure is there. We must want to read it.

This reasoning, laborious to pursue manually, is achievable by algorithm. It is even more natural through artificial intelligence. And if AI needs clean data, the digital model — with its precise geometry, its positioned objects, its spatial relationships — is the gold-standard input to provide. Provided we look at it for what it truly is: a spatial model, not a three-dimensional spreadsheet.

It is at this price of a change in perspective that we will be able to shed the difficulties we know — and truly make a leap in this era of digital transformation.

---

## The Logical Continuation

This change in perspective has immediate, concrete, verifiable consequences.

A piece of technical equipment whose reference is written into the model can be cross-checked against the manufacturer's data sheet. Its geometry says whether it is at the correct scale, whether it fits within its plant room, whether it does not collide with the structure. No attributes required.

A WC can be identified as such by its shape and equipment — independently of its IFC label. Its door can be verified. Its washbasin. The nature of the adjacent room. All of this is in the geometry.

A sanitary fitting whose mesh bottom is 1.40 metres from the nearest drainage outlet — when connection rules require less than 150 mm — is an anomaly invisible on a 2D plan. It is flagrant in spatial analysis.

These checks do not require a perfectly populated model. They require a correctly drawn model. And that, the teams are already doing. They always have been.

---

## Closing Note

LLMs and MCP are going to profoundly change our profession. Powerful design tools will emerge — perhaps even in open source.

Working on the client side and facing these difficulties first-hand, I undertook to work on this paradigm shift project. Its benefit is not limited to the client.

If you are ambitious, passionate about doing things better, motivated to change things for the good — a sharp coder, open-minded, ready for change.

Join us here: [github.com/paliabra/bim](https://github.com/paliabra/bim)
