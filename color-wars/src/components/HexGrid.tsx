import { Svg, SVG } from '@svgdotjs/svg.js'
import { defineHex, Grid, ring, Hex } from 'honeycomb-grid'
import { useLayoutEffect, useRef, useEffect, useState } from 'react'
import { initializeDemoGame } from '@/stores/gameStoreHelpers'
import Polygon from './Polygon'



const HexGrid = () => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [gridData, setGridData] = useState<{ hexes: Hex[], draw: Svg | null }>({ hexes: [], draw: null });

    // Initialize demo game on component mount
    useEffect(() => {
        initializeDemoGame();
    }, []);

    useLayoutEffect(() => {
        if (!svgRef.current) return;

        // Create hex grid
        const Hexagon = defineHex({ dimensions: 30, origin: 'topLeft' });
        const grid = new Grid(Hexagon, [
            ring({ center: new Hexagon(), radius: 3 }),
        ]);
        
        const draw = SVG(svgRef.current) as Svg;
        
        // Calculate bounding box for viewBox
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        grid.forEach(hex => {
            hex.corners.forEach(({ x, y }) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            });
        });
        
        // Set viewBox to center and fit all hexagons
        const padding = 30;
        const viewBoxWidth = (maxX - minX) + 2 * padding;
        const viewBoxHeight = (maxY - minY) + 2 * padding;
        const viewBoxX = minX - padding;
        const viewBoxY = minY - padding;
        
        draw.viewbox(viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight);
        
        // Store grid data for rendering Polygon components
        setGridData({ hexes: Array.from(grid), draw });
        
        // Cleanup
        return () => {
            draw.clear();
        };
    }, [])

    return(
        <>
            <style>{`
                /* Zustand-powered hex cells */
                .hex-cell {
                    fill: #303030;
                    stroke: #fff;
                    stroke-width: 2px;
                    cursor: pointer;
                    transition: fill 0.2s ease-in-out, transform 0.2s ease-in-out;
                }
                
                .hex-cell:hover {
                    fill: #ff6060 !important;
                    transform: scale(1.05);
                }
                
                .hex-cell.owned {
                    stroke-width: 3px;
                    stroke: #fff;
                }
                
                .hex-cell.animating {
                    animation: hexClaim 0.5s ease-in-out;
                }
                
                @keyframes hexClaim {
                    0% { 
                        transform: scale(1); 
                        stroke-width: 2px;
                    }
                    50% { 
                        transform: scale(1.2); 
                        stroke-width: 4px;
                        stroke: #ffff00;
                    }
                    100% { 
                        transform: scale(1); 
                        stroke-width: 3px;
                    }
                }
            `}</style>
            
            {/* Render Polygon components */}
            {gridData.draw && gridData.hexes.map((hex) => (
                <Polygon 
                    key={`${hex.q},${hex.r}`}
                    hex={hex} 
                    draw={gridData.draw!} 
                />
            ))}
            
            <div id='hex-grid-container' style={
                {width: "100%", height: "60vh", border: "2px solid black"}}>
                <svg 
                    ref={svgRef} 
                    preserveAspectRatio="xMidYMid meet" width="100%" height="100%" 
                    style={{ border: "1px solid black" }}
                />
            </div>
        </>
    )
}

export default HexGrid