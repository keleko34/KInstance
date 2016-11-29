/* Build */
/* End Build */

define(['KB','KMapper','KObservableViewmodel','KTemplates'],function(K,KMaps,KViewmodel,Ktemplates){
  function CreateKInstance()
  {
    var _actions = {
      template:[],
      load:[]
    },
    _onaction = function(a)
    {
      for(var x=0,len=_actions[a.type].length;x<len;x++)
      {
        if(!a._stopPropogation) _actions[a.type][x](a);
      }
      return a._preventDefault;
    },
    KInstance = {};

    function actionObject(type,data,args)
    {
      this.stopPropagation = function(){
        this._stopPropagation = true;
      }
      this.type = type;
      this.data = data;
      this.args = args;
    }

    KInstance.register = function(name,viewmodel,template)
    {
      var vm = KViewmodel.register(name,viewmodel),
          tm = Ktemplates.register(name,template),
          a = new actionObject('template',tm,arguments);
      _onaction(a);
      return this;
    }

    KInstance.create = function(node)
    {

    }

    return KInstance;
  }
  return CreateKInstance;
});


/* instance

<div>

<cool> <-- new instance
 <something>{{why}}</something> <-- new instance
</cool>
</div>

*/
