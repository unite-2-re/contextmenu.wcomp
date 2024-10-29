import { openContextMenu } from "../dist/contextmenu.js";

//
document.addEventListener("contextmenu", (e)=>{
    e.preventDefault();

    //
    openContextMenu(e, [
        {content: "Properties", callback: ()=>{console.log("Properties")}},
        {content: "Clone", callback: ()=>{console.log("Clone")}}
    ]);
});
