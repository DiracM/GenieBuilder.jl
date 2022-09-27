function initTraitsEditor(){

    let traitComponent = Vue.component('trait-field', {
        components: Quasar.components,
        props: [ 'trait',  'traitvaluesobj'],
        data: function () {
          return {
            count: 0, 
            typesMap: {
                "{Bool}": "Bool", 
                "{String}": "String", 
                "{Char}": "String", 
                "{Number}": "Number", 
                    "{Int64}": "Number", 
                    "{Int32}": "Number", 
                    "{Int16}": "Number", 
                    "{Int8}": "Number",
                "{Vector}": "Vector",
                    "{Vector{Bool}}": "Vector",
                    "{Vector{String}}": "Vector",
                    "{Vector{Char}}": "Vector",
                    "{Vector{Number}}": "Vector",
                    "{Vector{Int64}}": "Vector",
                    "{Vector{Int32}}": "Vector",
                    "{Vector{Int16}}": "Vector",
                    "{Vector{Int8}}": "Vector", 
                "{Object}": "Object", 
                "{Dict}": "Object", 
            }
          }
        },
        //template: '<button v-on:click="count++">Me ha pulsado {{ count }} veces.</button>', 
        template: `<q-select
            ref="select"
            new-value-mode="add-unique" use-input hide-selected fill-input hide-dropdown-icon clearable
            v-model="traitvaluesobj[trait.id]" 
            :options="getAppModelFields(trait)"
            :placeholder="trait.attributes.juliaType?.split('|').join(', ')||''" 
            @input="onInputChanged(trait)" `+
            /* @keyup="keyUp($event, trait)"  */
            `@filter="filterFn" 
            @focus="onFocus" 
            class="propSelect"` + 
            /* @keyup="onkeyup" 
            :class="{bindingMatch: inputValueMatchesModelProperty() }" */
        `></q-select>`, 
        methods: {
            onFocus(){
                console.log( "onFocus" );
            },
            filterFn (val, update, abort) {          
                setTimeout(() => {
                  update(() => {
                    let fieldsList = this.getAppModelFields(this.trait);
                    if (val === '') {
                        this.$refs.select.options = fieldsList;
                    }
                    else {
                      const needle = val.toLowerCase()
                      this.$refs.select.options = fieldsList.filter(v => v.toLowerCase().indexOf(needle) > -1)
                    }
                  })
                }, 500)
              },
            
            /* inputValueMatchesModelProperty( ){
                let inputValue = this.inputValue || this.traitvaluesobj[this.trait.id]; // this.traitvaluesobj[this.trait.id]; //
                let matches = false;
                for (let i = 0; i < window.appConfiguration.modelFields.length; i++) {
                    const element = window.appConfiguration.modelFields[i];
                    if( element.name == inputValue ){
                        matches = true;
                        break;
                    }                    
                }
                 
                //let matches = window.appConfiguration.modelFields.find( p => p.name == inputValue );
                return matches;
            },  */

            getAppModelFields: function(trait){
                //console.log( 'getAppModelFields()', trait );
                //let inputValue = this.$refs.select?.inputValue || "";
                let traitTypes = trait.attributes.juliaType?trait.attributes.juliaType.split("|") : [];
                let results = window.appConfiguration.modelFields.filter( (item)=>{
                    // If julia type not send, include all bindings
                    let juliaTypeNotSet = trait.attributes.juliaType == null || trait.attributes.juliaType.length == 0;
                    if( juliaTypeNotSet )
                        return true

                    let modelPropType = item.type;
                    let cleanModelType = modelPropType.replace("Stipple.Reactive", "");
                    let modelBaseType = this.typesMap[cleanModelType];
                    for( let i=0; i<traitTypes.length; i++ ){
                        let traitType = traitTypes[i];
                        let matchesType = modelBaseType == traitType;
                        //let containsSearch = inputValue=='' || inputValue==null || item.name.toLowerCase().indexOf(inputValue.toLowerCase()) > -1;
                        if( matchesType /* && containsSearch */ ){
                            return true;
                        }
                    }
                    return false;
                });
                results = results.map( (item)=>{
                    return item.name;
                });
                return results;
            }, 
            onInputChanged(trait){
                let traitId = trait.id;
                let traitValue = this.traitvaluesobj[traitId];
                console.log("Traits Editor onInputchanged", traitId, traitValue, trait );
                let tr = traitsEditor.component.getTrait(traitId)
                tr.setValue(traitValue);
                //this.inputValue = traitValue;
                markUnsavedChanges(true);
            }, 
            /* onkeyup(){
                let inputValue;
                if( this.$refs.select ){
                    inputValue = this.$refs.select.inputValue
                }else{
                    inputValue = this.traitvaluesobj[this.trait.id];
                }
                this.inputValue = inputValue;
                this.$forceUpdate();
            } */
            /* keyUp( event, trait ){
                console.log( "input value: ", this.$refs.select.inputValue );
            }, */
        }
      })

    window.traitsEditor = new Vue({
        components: { ...Quasar.components, traitComponent },
        el:"#traits_panel",
        data: {
            search: "", 
            dummyProp: "", 
            allTraits: [ /* { id:"id1", value:"1" }, { id:"id2", value:"2" } */ ],
            enabledTraits: [], 
            categories: [], 
            categoriesStatus: {}, 
            traitValuesObj: {},
        },
        computed: {
            categoriesFiltered(){
                if( !this.categories )
                    return [];
                
                /* if( this.search=="" )
                    return this.categories; */
                
                let searchLowercase = this.search.toLowerCase();

                //let categoriesFiltered = [];
                this.categories.forEach( (category)=>{
                    let numMatchesInCategory = 0;
                    category.traits.forEach( (trait)=>{
                        let label = (trait.attributes.label && trait.attributes.label.length > 0 )?trait.attributes.label:trait.attributes.name;
                        let traitLabel = label.toLowerCase();
                        let traitDescription = trait.attributes.desc ? trait.attributes.desc.toLowerCase() : "";
                        let matchesSearchLabel = this.search=="" || traitLabel.indexOf( searchLowercase ) > -1;
                        let matchesSearchLDesc = this.search=="" || traitDescription.indexOf( searchLowercase ) > -1;
                        trait.shouldShow = matchesSearchLabel || matchesSearchLDesc;
                        if( trait.shouldShow )
                            numMatchesInCategory++;
                    });
                    category.shouldShow = numMatchesInCategory > 0;
                    /* let filteredTraits = category.traits.filter( (trait)=>{
                        let traitName = trait.name.toLowerCase();
                        return traitName.toLowerCase().indexOf( searchLowercase ) > -1;
                    });
                    if( filteredTraits.length > 0 ){
                        categoriesFiltered.push({
                            name: category.name, 
                            traits: filteredTraits
                        });
                    } */
                });
                return this.categories;
            }
        },
        methods: {
            
            
            getTraitTooltipText(trait){
                let result = '(' + trait.attributes.type + ')\n' + trait.attributes.desc;
                if( trait.attributes.examples ){
                    let cleanExamples = trait.attributes.examples.map( item =>{
                        if( typeof item == "string" && item.indexOf("=") > 0 )
                            return item.split("=")[1];
                        else
                            return item;
                    });

                    result += '\n\nExamples: \n - ' + cleanExamples.join('\n - ');
                }
                return result;
            }, 
            
            assignComponent: function( component ) {
                console.log( "Traits Editor assignComponent: ", component );
                this.component = component;
                if( !component ){
                    this.traitValuesObj = {};
                    this.allTraits = [];
                    this.enabledTraits = [];
                    this.categories = [];
                    return;
                }
                this.traitValuesObj = component.attributes.attributes;
                this.traits = component.attributes.traits.models;
                this.enabledTraits = this.traits.filter( (trait)=>{ 
                    return trait.get('enabled') !== false;
                } );


                let categoriesDict = {};
                let categories = [];

                this.enabledTraits.forEach( (trait)=>{ 
                    let cat = trait.attributes.category || "General";
                    if( this.categoriesStatus[cat] === undefined)
                        this.categoriesStatus[cat] = true;

                    if( categoriesDict[cat] == null ){
                        categoriesDict[cat] = { name: cat, expanded: this.categoriesStatus[cat], traits: [] };
                        categories.push( categoriesDict[cat] );
                        
                    }
                    categoriesDict[cat].traits.push( trait );
                } );
                this.categories = categories;
                console.log( "Traits Editor assignComponent TRAITS: ", this.traits );
            },

            

            

            formatLabel( trait ){
                let label = (trait.attributes.label && trait.attributes.label.length > 0 )?trait.attributes.label:trait.attributes.name;
                let formatted = label.split('-').join(' ').split(':').join('');
                return formatted;
            }, 

            toggleCategory( category ){
                category.expanded = !category.expanded;
                this.categoriesStatus[category.name] = category.expanded;
            }, 
            

        }, 
        mounted(){
            console.log( "TraitsEditor mounted: ", window.selectedElementModel);
            if( window.selectedElementModel != null ){
                this.assignComponent( window.selectedElementModel );
            }
        }
    });
}