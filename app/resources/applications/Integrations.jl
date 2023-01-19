module Integrations

module GenieCloud

using HTTP
using JSON3
using SearchLight

import GenieBuilder

# this wraps the whole module body!
if haskey(ENV, "GC_API_ENDPOINT") && haskey(ENV, "GC_API_TOKEN")

const AUTO_SYNC_INTERVAL = 5 # seconds
const SYNC_DELAY = 2 # seconds

const GC_API_ENDPOINT_APPS = ENV["GC_API_ENDPOINT"] * "/apps"
const GC_API_ENDPOINT_CONTAINERS = ENV["GC_API_ENDPOINT"] * "/containers"
const GC_API_HEADERS = [
  "Authorization" => "bearer $(ENV["GC_API_TOKEN"])",
  "Content-Type" => "application/json",
  "Accept" => "application/json",
]

function datasync()::Nothing
  container_online()
  importapps()

  nothing
end

function init()::Nothing
  container_started()
  datasync()

  while AUTO_SYNC_INTERVAL > 0
    sleep(AUTO_SYNC_INTERVAL)
    datasync()
  end

  nothing
end

function getapps()::Vector{JSON3.Object}
  response = HTTP.get(GC_API_ENDPOINT_APPS; headers = GC_API_HEADERS)

  String(response.body) |> JSON3.read
end

function importapps()::Nothing
  for app in getapps()
    @info app

    # retrieve matching app from GenieBuilder database
    existing_app = findone(GenieBuilder.Applications.Application, name = app.name)

    # if the app is in error state or deleted, update the status of GenieCloud app end continue
    if existing_app !== nothing && (
      GenieBuilder.ApplicationsController.status == GenieBuilder.ApplicationsController.DELETED_STATUS ||
      GenieBuilder.ApplicationsController.status == GenieBuilder.ApplicationsController.ERROR_STATUS)

      @async updateapp(existing_app, 0)
      continue
    end

    # if the app is in creating state and , create it in GenieBuilder
    if app.dev_status == GenieBuilder.ApplicationsController.CREATING_STATUS
      if existing_app === nothing
        GenieBuilder.ApplicationsController.create(app.name)
        @async updateapp(existing_app, SYNC_DELAY)
        continue
      end

    # if the app is in starting state but not starting nor online, start it from GenieBuilder
    elseif app.dev_status == GenieBuilder.ApplicationsController.STARTING_STATUS &&
            existing_app.status != GenieBuilder.ApplicationsController.STARTING_STATUS &&
              existing_app.status != GenieBuilder.ApplicationsController.ONLINE_STATUS
      GenieBuilder.ApplicationsController.start(existing_app)
      @async updateapp(existing_app, SYNC_DELAY)
      continue

    # if the app is in stopping state but not stopping nor offline, stop it from GenieBuilder
    elseif app.dev_status == GenieBuilder.ApplicationsController.STOPPING_STATUS &&
            existing_app.status != GenieBuilder.ApplicationsController.OFFLINE_STATUS &&
              existing_app.status != GenieBuilder.ApplicationsController.STOPPING_STATUS
      GenieBuilder.ApplicationsController.stop(existing_app)
      @async updateapp(existing_app, SYNC_DELAY)
      continue

    # if the app is in deleting state, delete it from GenieBuilder -- but do not purge the app
    elseif app.dev_status == GenieBuilder.ApplicationsController.DELETING_STATUS
      GenieBuilder.ApplicationsController.delete(existing_app)
      @async updateapp(existing_app, SYNC_DELAY)
      continue
    end
  end

  nothing
end

function updateapp(app, delay = 0)::Nothing
  sleep(delay)
  try
    response = HTTP.patch(GC_API_ENDPOINT_APPS * "/$(app.name)";
                          headers = GC_API_HEADERS,
                          body = Dict(
                                        "name" => app.name,
                                        "devStatus" => app.status,
                                      ) |> JSON3.write,
                          status_exception = false
                        )
    @info response.body |> String
  catch e
    @error e
  end

  nothing
end

function container_started(delay = 0)::Nothing
  update_container_status(delay; status = GenieBuilder.ApplicationsController.STARTED_STATUS)
end

function container_online(delay = 0)::Nothing
  update_container_status(delay; status = GenieBuilder.ApplicationsController.ONLINE_STATUS)
end

function container_idle()
  update_container_status(0; status = GenieBuilder.ApplicationsController.STOPPING_STATUS)
end

function update_container_status(delay = 0; status)::Nothing
  sleep(delay)
  try
    response = HTTP.patch(GC_API_ENDPOINT_CONTAINERS;
                          headers = GC_API_HEADERS,
                          body = Dict("status" => status) |> JSON3.write,
                          status_exception = false
                        )
    @info response.body |> String
  catch e
    @error e
  end

  nothing
end

else
  function init()::Nothing
    @debug "GenieCloud integration is not enabled.
    Please set the GC_API_ENDPOINT and GC_API_TOKEN environment variables."

    nothing
  end

  function updateapp(app, delay = 0)::Nothing
    nothing
  end
end # end if

end # GenieCloud

end