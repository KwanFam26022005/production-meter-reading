# V8 Meter Placement Engine Contract — Cảng Tân Thuận

## Precision Inverse Projection

Meter placement and relocation use hardware SVG CTM inversion to translate mouse pointer interactions into authoritative canonical pixels:

$$egin{pmatrix} x_{	ext{svg}} \ y_{	ext{svg}} \end{pmatrix} = 	ext{CTM}^{-1} egin{pmatrix} x_{	ext{client}} \ y_{	ext{client}} \end{pmatrix}$$
$$egin{pmatrix} x_{	ext{canonical}} \ y_{	ext{canonical}} \end{pmatrix} = rac{1}{	ext{zoom}} \left( egin{pmatrix} x_{	ext{svg}} \ y_{	ext{svg}} \end{pmatrix} - egin{pmatrix} 	ext{pan}_X \ 	ext{pan}_Y \end{pmatrix} ight)$$

## Placement Workflow
1. User enters placement/relocation mode via ContextRail.
2. 32×18 canonical grid illuminates across the canvas.
3. Live cursor tracks in canonical pixel coordinates with crosshair reticle.
4. User clicks to pin candidate marker.
5. Real-time validation checks containment in target zone polygon.
   - Inside: Reticle glows green (`#10B981`), form inputs unlocked.
   - Outside: Reticle turns warning red (`#EF4444`), alert displayed.
6. Persistence saves normalized coordinates $(x_{	ext{norm}}, y_{	ext{norm}})$ to backend API.
